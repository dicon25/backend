import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@scholub/database';
import { PrismaService } from '@/common/modules/prisma';
import { PaperEntity } from '@/modules/paper/domain/entities';
import {
  CategoryWithCount,
  PaginatedPapers,
  PaperListOptions,
  PaperRepositoryPort,
} from '@/modules/paper/domain/repositories';
import { PaperSearchRepository, PaperSyncService } from '@/modules/paper/infrastructure/search/meilisearch';
import { PaperMapper } from '../mappers';

@Injectable()
export class PaperRepository implements PaperRepositoryPort {
  private readonly logger = new Logger(PaperRepository.name);

  constructor(private readonly prisma: PrismaService,
    private readonly paperSearchRepository: PaperSearchRepository,
    private readonly paperSyncService: PaperSyncService) {
  }

  async create(paper: Partial<PaperEntity>): Promise<PaperEntity> {
    const data = PaperMapper.toPersistence(paper);
    const created = await this.prisma.paper.create({ data: data as Prisma.PaperCreateInput });

    return PaperMapper.toDomain(created);
  }

  async findById(id: string): Promise<PaperEntity | null> {
    const paper = await this.prisma.paper.findUnique({ where: { id } });

    return paper ? PaperMapper.toDomain(paper) : null;
  }

  async findByPaperId(paperId: string): Promise<PaperEntity | null> {
    const paper = await this.prisma.paper.findUnique({ where: { paperId } });

    return paper ? PaperMapper.toDomain(paper) : null;
  }

  async findByDoi(doi: string): Promise<PaperEntity | null> {
    const paper = await this.prisma.paper.findUnique({ where: { doi } });

    return paper ? PaperMapper.toDomain(paper) : null;
  }

  async list(options: PaperListOptions): Promise<PaginatedPapers> {
    // Use MeiliSearch if it's available (MeiliSearch supports empty queries for full search)
    if (this.paperSearchRepository) {
      try {
        return await this.paperSearchRepository.search(options);
      } catch (error) {
        this.logger.warn('MeiliSearch search failed, falling back to PostgreSQL', error);

        // Fall through to PostgreSQL search
      }
    }

    // Fallback to PostgreSQL search
    return await this.prismaSearch(options);
  }

  private async prismaSearch(options: PaperListOptions): Promise<PaginatedPapers> {
    const {
      page,
      limit,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      filters,
    } = options;

    const skip = (page - 1) * limit;
    const where: Prisma.PaperWhereInput = {};

    if (filters?.categories && filters.categories.length > 0) {
      where.categories = { hasSome: filters.categories };
    }

    if (filters?.authors && filters.authors.length > 0) {
      where.authors = { hasSome: filters.authors };
    }

    if (filters?.year) {
      where.issuedAt = {
        gte: new Date(`${filters.year}-01-01`),
        lt:  new Date(`${filters.year + 1}-01-01`),
      };
    }

    if (filters?.searchQuery) {
      where.OR = [
        { title: {
          contains: filters.searchQuery, mode: 'insensitive',
        } },
        { summary: {
          contains: filters.searchQuery, mode: 'insensitive',
        } },
        { authors: { hasSome: [filters.searchQuery] } },
      ];
    }

    const [papers, total] = await Promise.all([
      this.prisma.paper.findMany({
        where,
        skip,
        take:    limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.paper.count({ where }),
    ]);

    return {
      papers:     papers.map(PaperMapper.toDomain),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async update(id: string, data: Partial<PaperEntity>): Promise<PaperEntity> {
    const updateData = PaperMapper.toPersistence(data);

    const updated = await this.prisma.paper.update({
      where: { id },
      data:  updateData,
    });

    const result = PaperMapper.toDomain(updated);

    // Update in MeiliSearch
    if (this.paperSyncService) {
      try {
        await this.paperSyncService.updatePaper(id, data);
      } catch (error) {
        this.logger.warn(`Failed to update paper in MeiliSearch: ${id}`, error);

        // Don't throw - allow the operation to continue even if indexing fails
      }
    }

    return result;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.paper.delete({ where: { id } });
  }

  async incrementViewCount(id: string): Promise<void> {
    await this.prisma.paper.update({
      where: { id },
      data:  { totalViewCount: { increment: 1 } },
    });
  }

  async getCategories(): Promise<CategoryWithCount[]> {
    const papers = await this.prisma.paper.findMany({ select: { categories: true } });
    const categoryMap = new Map<string, number>;

    papers.forEach(paper => {
      paper.categories.forEach(category => {
        categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
      });
    });

    return Array.from(categoryMap.entries())
      .map(([category, count]) => ({
        category, count,
      }))
      .sort((a, b) => b.count - a.count);
  }

  async findByCategory(category: string, options: PaperListOptions): Promise<PaginatedPapers> {
    const {
      page,
      limit,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    const skip = (page - 1) * limit;
    const where: Prisma.PaperWhereInput = { categories: { has: category } };

    const [papers, total] = await Promise.all([
      this.prisma.paper.findMany({
        where,
        skip,
        take:    limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.paper.count({ where }),
    ]);

    return {
      papers:     papers.map(PaperMapper.toDomain),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getHeadlinePapers(limit: number): Promise<PaperEntity[]> {
    // 최근 7일 내 추가 + 인기도 점수 상위
    const sevenDaysAgo = new Date;

    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const papers = await this.prisma.$queryRaw<Array<{
      id:                 string;
      paperId:            string;
      title:              string;
      categories:         string[];
      authors:            string[];
      summary:            string;
      translatedSummary:  string | null;
      content:            Prisma.JsonValue;
      hashtags:           string[];
      translatedHashtags: string[];
      doi:                string;
      url:                string | null;
      pdfUrl:             string | null;
      issuedAt:           Date | null;
      likeCount:          number;
      unlikeCount:        number;
      totalViewCount:     number;
      thumbnailId:        string | null;
      pdfId:              string;
      createdAt:          Date;
      updatedAt:          Date;
    }>>`
      SELECT *
      FROM "Paper"
      WHERE "createdAt" >= ${sevenDaysAgo}
      ORDER BY (("likeCount" * 2) + "totalViewCount") DESC, "createdAt" DESC
      LIMIT ${limit}
    `;

    return papers.map(paper => PaperMapper.toDomain(paper));
  }

  async getPopularPapers(limit: number, days: number = 90): Promise<PaperEntity[]> {
    const daysAgo = new Date;

    daysAgo.setDate(daysAgo.getDate() - days);

    const papers = await this.prisma.$queryRaw<Array<{
      id:                 string;
      paperId:            string;
      title:              string;
      categories:         string[];
      authors:            string[];
      summary:            string;
      translatedSummary:  string | null;
      content:            Prisma.JsonValue;
      hashtags:           string[];
      translatedHashtags: string[];
      doi:                string;
      url:                string | null;
      pdfUrl:             string | null;
      issuedAt:           Date | null;
      likeCount:          number;
      unlikeCount:        number;
      totalViewCount:     number;
      thumbnailId:        string | null;
      pdfId:              string;
      createdAt:          Date;
      updatedAt:          Date;
    }>>`
      SELECT *
      FROM "Paper"
      WHERE "createdAt" >= ${daysAgo}
      ORDER BY (("likeCount" * 2) + "totalViewCount") DESC, "createdAt" DESC
      LIMIT ${limit}
    `;

    return papers.map(paper => PaperMapper.toDomain(paper));
  }

  async getLatestPapers(limit: number): Promise<PaperEntity[]> {
    // 발행일(issuedAt) 최신순, 없으면 createdAt 최신순
    const papers = await this.prisma.paper.findMany({
      take:    limit,
      orderBy: [
        { issuedAt: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return papers.map(paper => PaperMapper.toDomain(paper));
  }
}

