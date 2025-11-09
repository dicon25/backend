import { QueryDslBoolQuery, QueryDslQueryContainer, SortCombinations } from '@elastic/elasticsearch/lib/api/types';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/modules/prisma';
import { PaperSortBy, SortOrder } from '@/modules/paper/domain/enums';
import { PaginatedPapers, PaperListOptions } from '@/modules/paper/domain/repositories';
import { PaperMapper } from '@/modules/paper/infrastructure/persistence/mappers';
import { ElasticsearchService } from './elasticsearch.service';
import { PaperIndexService } from './paper-index.service';

@Injectable()
export class PaperSearchRepository {
  private readonly logger = new Logger(PaperSearchRepository.name);

  constructor(private readonly elasticsearchService: ElasticsearchService,
    private readonly paperIndexService: PaperIndexService,
    private readonly prisma: PrismaService) {
  }

  async search(options: PaperListOptions): Promise<PaginatedPapers> {
    if (!this.elasticsearchService.isEnabled()) {
      throw new Error('Elasticsearch is not enabled');
    }

    const client = this.elasticsearchService.getClient();

    if (!client) {
      throw new Error('Elasticsearch client is not available');
    }

    const indexName = this.elasticsearchService.getIndexName();

    const {
      page,
      limit,
      sortBy = PaperSortBy.CREATED_AT,
      sortOrder = SortOrder.DESC,
      filters,
    } = options;

    const from = (page - 1) * limit;

    try {
      await this.paperIndexService.ensureIndexExists();

      const boolQuery: QueryDslBoolQuery = {
        must:   [] as QueryDslQueryContainer[],
        filter: [] as QueryDslQueryContainer[],
      };

      const query: QueryDslQueryContainer = { bool: boolQuery };

      if (filters?.searchQuery) {
        (boolQuery.must as QueryDslQueryContainer[]).push({ multi_match: {
          query:  filters.searchQuery,
          fields: [
            'title^3',
            'summary^2',
            'authors^1.5',
            'categories^1',
          ],
          type:           'best_fields',
          fuzziness:      'AUTO',
          operator:       'or',
          prefix_length:  2,
          max_expansions: 50,
        } });
      } else {
        (boolQuery.must as QueryDslQueryContainer[]).push({ match_all: {} });
      }

      if (filters?.categories && filters.categories.length > 0) {
        (boolQuery.filter as QueryDslQueryContainer[]).push({ terms: { categories: filters.categories } });
      }

      if (filters?.authors && filters.authors.length > 0) {
        (boolQuery.filter as QueryDslQueryContainer[]).push({ terms: { 'authors.keyword': filters.authors } });
      }

      if (filters?.year) {
        (boolQuery.filter as QueryDslQueryContainer[]).push({ range: { issuedAt: {
          gte: `${filters.year}-01-01`,
          lt:  `${filters.year + 1}-01-01`,
        } } });
      }

      const sort: SortCombinations[] = [];

      let sortField: string;

      switch (sortBy) {
        case PaperSortBy.ISSUED_AT:
          sortField = 'issuedAt';

          break;

        case PaperSortBy.LIKE_COUNT:
          sortField = 'likeCount';

          break;

        case PaperSortBy.VIEW_COUNT:
          sortField = 'totalViewCount';

          break;

        case PaperSortBy.CREATED_AT:

        default:
          sortField = 'createdAt';

          break;
      }

      sort.push({ [sortField]: { order: sortOrder === SortOrder.ASC ? 'asc' : 'desc' } });

      if (filters?.searchQuery) {
        sort.push({ _score: { order: 'desc' } });
      }

      const response = await client.search({
        index: indexName,
        query,
        sort,
        from,
        size:  limit,
      });

      const total = typeof response.hits.total === 'number'
        ? response.hits.total
        : response.hits.total?.value ?? 0;

      const hits = response.hits.hits;

      const paperIds = hits.map(hit => {
        const source = hit._source as {
          id: string;
        };

        return source.id;
      });

      const papers = await this.prisma.paper.findMany({
        where:   { id: { in: paperIds } },
        orderBy: paperIds.length > 0 ? { id: 'asc' } : { [sortField]: sortOrder },
      });

      const paperMap = new Map(papers.map(p => [p.id, p]));

      const orderedPapers = paperIds
        .map(id => paperMap.get(id))
        .filter(Boolean) as typeof papers;

      return {
        papers:     orderedPapers.map(PaperMapper.toDomain),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error('Elasticsearch search failed', error);

      throw error;
    }
  }
}

