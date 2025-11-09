import { Injectable, Logger } from '@nestjs/common';
import { ElasticsearchService } from './elasticsearch.service';
import { PaperIndexService } from './paper-index.service';
import { PaperListOptions, PaginatedPapers } from '../../../domain/repositories';
import { PaperSortBy, SortOrder } from '../../../domain/enums';
import { PaperMapper } from '../../persistence/mappers';
import { PrismaService } from '@/common/modules/prisma';

@Injectable()
export class PaperSearchRepository {
  private readonly logger = new Logger(PaperSearchRepository.name);

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    private readonly paperIndexService: PaperIndexService,
    private readonly prisma: PrismaService,
  ) {}

  async search(options: PaperListOptions): Promise<PaginatedPapers> {
    if (!this.elasticsearchService.isEnabled()) {
      throw new Error('Elasticsearch is not enabled');
    }

    const client = this.elasticsearchService.getClient();
    if (!client) {
      throw new Error('Elasticsearch client is not available');
    }

    const indexName = this.elasticsearchService.getIndexName();
    const { page, limit, sortBy = PaperSortBy.CREATED_AT, sortOrder = SortOrder.DESC, filters } = options;
    const from = (page - 1) * limit;

    try {
      await this.paperIndexService.ensureIndexExists();

      // Build query
      const query: any = {
        bool: {
          must: [],
          filter: [],
        },
      };

      // Search query
      if (filters?.searchQuery) {
        query.bool.must.push({
          multi_match: {
            query: filters.searchQuery,
            fields: [
              'title^3',      // 제목에 가중치 3배
              'summary^2',   // 요약에 가중치 2배
              'authors^1.5', // 저자에 가중치 1.5배
              'categories^1', // 카테고리에 가중치 1배
            ],
            type: 'best_fields',
            fuzziness: 'AUTO',
          },
        });
      } else {
        // Match all if no search query
        query.bool.must.push({ match_all: {} });
      }

      // Filters
      if (filters?.categories && filters.categories.length > 0) {
        query.bool.filter.push({
          terms: { categories: filters.categories },
        });
      }

      if (filters?.authors && filters.authors.length > 0) {
        query.bool.filter.push({
          terms: { 'authors.keyword': filters.authors },
        });
      }

      if (filters?.year) {
        query.bool.filter.push({
          range: {
            issuedAt: {
              gte: `${filters.year}-01-01`,
              lt: `${filters.year + 1}-01-01`,
            },
          },
        });
      }

      // Build sort
      const sort: any[] = [];

      // Map PaperSortBy to Elasticsearch field
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

      sort.push({
        [sortField]: {
          order: sortOrder === SortOrder.ASC ? 'asc' : 'desc',
        },
      });

      // If there's a search query, also sort by relevance score
      if (filters?.searchQuery) {
        sort.push({ _score: { order: 'desc' } });
      }

      // Execute search
      const response = await client.search({
        index: indexName,
        body: {
          query,
          sort,
          from,
          size: limit,
        },
      });

      // Handle total count (Elasticsearch 8.x returns object with value property)
      const total = typeof response.hits.total === 'number'
        ? response.hits.total
        : response.hits.total?.value ?? 0;
      const hits = response.hits.hits;

      // Get paper IDs from Elasticsearch results
      const paperIds = hits.map((hit: any) => hit._source.id);

      // Fetch full paper data from PostgreSQL
      // This ensures we get all fields including content, pdfId, etc.
      const papers = await this.prisma.paper.findMany({
        where: {
          id: { in: paperIds },
        },
        orderBy: paperIds.length > 0
          ? {
              // Preserve Elasticsearch result order
              id: 'asc', // This will be reordered below
            }
          : { [sortField]: sortOrder },
      });

      // Reorder papers to match Elasticsearch results
      const paperMap = new Map(papers.map(p => [p.id, p]));
      const orderedPapers = paperIds
        .map(id => paperMap.get(id))
        .filter(Boolean) as typeof papers;

      return {
        papers: orderedPapers.map(PaperMapper.toDomain),
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

