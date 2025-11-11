import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/modules/prisma';
import { PaperSortBy, SortOrder } from '@/modules/paper/domain/enums';
import { PaginatedPapers, PaperListOptions } from '@/modules/paper/domain/repositories';
import { PaperMapper } from '@/modules/paper/infrastructure/persistence/mappers';
import { MeiliSearchService } from './meilisearch.service';
import { PaperIndexService } from './paper-index.service';

@Injectable()
export class PaperSearchRepository {
  private readonly logger = new Logger(PaperSearchRepository.name);

  constructor(private readonly meiliSearchService: MeiliSearchService,
    private readonly paperIndexService: PaperIndexService,
    private readonly prisma: PrismaService) {
  }

  async search(options: PaperListOptions): Promise<PaginatedPapers> {
    if (!this.meiliSearchService.isEnabled()) {
      throw new Error('MeiliSearch is not enabled');
    }

    const client = this.meiliSearchService.getClient();

    if (!client) {
      throw new Error('MeiliSearch client is not available');
    }

    const indexName = this.meiliSearchService.getIndexName();

    const {
      page,
      limit,
      sortBy = PaperSortBy.CREATED_AT,
      sortOrder = SortOrder.DESC,
      filters,
    } = options;

    try {
      await this.paperIndexService.ensureIndexExists();

      const index = client.index(indexName);
      const searchQuery = filters?.searchQuery?.trim() || '';
      const filterArray: string[] = [];

      if (filters?.categories && filters.categories.length > 0) {
        const categoryFilters = filters.categories.map(cat => `categories = "${cat}"`).join(' OR ');

        filterArray.push(`(${categoryFilters})`);
      }

      if (filters?.authors && filters.authors.length > 0) {
        const authorFilters = filters.authors.map(author => `authors = "${author}"`).join(' OR ');

        filterArray.push(`(${authorFilters})`);
      }

      if (filters?.year) {
        const startDate = `${filters.year}-01-01T00:00:00Z`;
        const endDate = `${filters.year + 1}-01-01T00:00:00Z`;

        filterArray.push(`issuedAt >= ${startDate} AND issuedAt < ${endDate}`);
      }

      const filterString = filterArray.length > 0 ? filterArray.join(' AND ') : undefined;

      // Map sort field
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

      const sortArray = [`${sortField}:${sortOrder.toLowerCase()}`];

      /*
       * MeiliSearch Dashboard와 동일한 방식으로 검색
       * Dashboard는 multi-search를 사용하지만, 단일 인덱스이므로 index.search()를 사용합니다
       */
      // 기본 검색 옵션 (Dashboard와 최대한 동일하게)
      const searchOptions: {
        limit:                  number;
        offset:                 number;
        filter?:                string;
        sort?:                  string[];
        attributesToRetrieve:   string[];
        attributesToHighlight?: string[];
        highlightPreTag?:       string;
        highlightPostTag?:      string;
      } = {
        limit,
        offset:                (page - 1) * limit,
        attributesToRetrieve:  ['id'],
        attributesToHighlight: ['*'],  // Dashboard와 동일
        highlightPreTag:       '<ais-highlight-0000000000>',  // Dashboard와 동일
        highlightPostTag:      '</ais-highlight-0000000000>',  // Dashboard와 동일
      };

      // 필터가 있으면 추가
      if (filterString) {
        searchOptions.filter = filterString;
      }

      // 검색 쿼리가 없을 때만 정렬 적용 (검색 쿼리가 있으면 relevance로 자동 정렬됨)
      if (!searchQuery) {
        searchOptions.sort = sortArray;
      }

      const searchResult = await index.search(searchQuery, searchOptions);
      const total = searchResult.estimatedTotalHits || 0;
      const hits = searchResult.hits;
      const paperIds = hits.map(hit => hit.id as string).filter((id): id is string => id !== undefined);

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

      // Maintain the order from MeiliSearch results
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
      this.logger.error('Failed to search papers in MeiliSearch', error);

      throw error;
    }
  }
}
