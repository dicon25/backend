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
        must:                 [] as QueryDslQueryContainer[],
        should:               [] as QueryDslQueryContainer[],
        filter:               [] as QueryDslQueryContainer[],
        minimum_should_match: 0,
      };

      const query: QueryDslQueryContainer = { bool: boolQuery };

      if (filters?.searchQuery) {
        const searchQuery = filters.searchQuery.trim();
        const hasKorean = (/[ㄱ-ㅎㅏ-ㅣ가-힣]/).test(searchQuery);
        const hasEnglish = (/[a-zA-Z]/).test(searchQuery);
        const searchFields: string[] = [];

        if (hasKorean && !hasEnglish) {
          // Korean-only query
          searchFields.push('title.korean^4',
            'summary.korean^3',
            'translatedSummary^3',
            'categories.text^2');
        } else if (hasEnglish && !hasKorean) {
          // English-only query
          searchFields.push(
            'title.english^4',
            'summary.english^3',
            'translatedSummary.standard^2',
            'categories.text^2',
            'authors^1.5',
          );
        } else {
          searchFields.push(
            'title^3',
            'title.korean^2',
            'title.english^2',
            'summary^2',
            'summary.korean^1.5',
            'summary.english^1.5',
            'translatedSummary^2',
            'translatedSummary.standard^1.5',
            'categories.text^2',
            'authors^1.5',
          );
        }

        // Multi-match query
        (boolQuery.must as QueryDslQueryContainer[]).push({ multi_match: {
          query:                searchQuery,
          fields:               searchFields,
          type:                 'best_fields',
          minimum_should_match: '1',
        } });

        // Boost exact matches
        (boolQuery.should as QueryDslQueryContainer[]).push({ multi_match: {
          query:  searchQuery,
          fields: [
            'title.keyword^10',
            'categories^5',
            'authors.keyword^3',
          ],
          type:  'phrase',
          boost: 3.0,
        } });

        // Add fuzzy matching for typo tolerance
        if (searchQuery.length > 3) {
          (boolQuery.should as QueryDslQueryContainer[]).push({ multi_match: {
            query:         searchQuery,
            fields:        searchFields,
            type:          'best_fields',
            fuzziness:     'AUTO',
            prefix_length: 2,
            boost:         0.5,
          } });
        }
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

      sort.push({ [sortField]: { order: sortOrder.toLowerCase() as 'asc' | 'desc' } });

      // Add score as secondary sort for relevance
      if (filters?.searchQuery) {
        sort.unshift({ _score: { order: 'desc' } });
      }

      const response = await client.search({
        index:            indexName,
        from,
        size:             limit,
        query,
        sort,
        track_total_hits: true,
      });

      const total = typeof response.hits.total === 'number'
        ? response.hits.total
        : response.hits.total?.value ?? 0;

      const hits = response.hits.hits;
      const paperIds = hits.map(hit => hit._id).filter((id): id is string => id !== undefined);

      if (paperIds.length === 0) {
        return {
          papers:     [],
          total:      0,
          page,
          limit,
          totalPages: 0,
        };
      }

      // Fetch full paper data from database
      const papers = await this.prisma.paper.findMany({ where: { id: { in: paperIds } } });
      const paperMap = new Map(papers.map(paper => [paper.id, paper]));

      // Maintain the order from Elasticsearch results
      const orderedPapers = paperIds
        .map(id => paperMap.get(id))
        .filter((paper): paper is NonNullable<typeof paper> => paper !== undefined)
        .map(paper => PaperMapper.toDomain(paper));

      return {
        papers:     orderedPapers,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error('Failed to search papers in Elasticsearch', error);

      throw error;
    }
  }
}
