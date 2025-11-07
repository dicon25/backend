import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/modules/prisma';
import {
  CategoryWithCount,
  PaginatedPapers,
  PaperListOptions,
  PaperRepositoryPort,
} from '../../../domain/repositories';
import { PaperEntity } from '../../../domain/entities';
import { PaperMapper } from '../mappers';
import { Prisma } from '@scholub/database';

@Injectable()
export class PaperRepository implements PaperRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(paper: Partial<PaperEntity>): Promise<PaperEntity> {
    const data = PaperMapper.toPersistence(paper);
    const created = await this.prisma.paper.create({
      data: data as Prisma.PaperCreateInput,
    });
    return PaperMapper.toDomain(created);
  }

  async findById(id: string): Promise<PaperEntity | null> {
    const paper = await this.prisma.paper.findUnique({
      where: { id },
    });
    return paper ? PaperMapper.toDomain(paper) : null;
  }

  async findByPaperId(paperId: string): Promise<PaperEntity | null> {
    const paper = await this.prisma.paper.findUnique({
      where: { paperId },
    });
    return paper ? PaperMapper.toDomain(paper) : null;
  }

  async findByDoi(doi: string): Promise<PaperEntity | null> {
    const paper = await this.prisma.paper.findUnique({
      where: { doi },
    });
    return paper ? PaperMapper.toDomain(paper) : null;
  }

  async list(options: PaperListOptions): Promise<PaginatedPapers> {
    const { page, limit, sortBy = 'createdAt', sortOrder = 'desc', filters } = options;
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
        lt: new Date(`${filters.year + 1}-01-01`),
      };
    }

    if (filters?.searchQuery) {
      where.OR = [
        { title: { contains: filters.searchQuery, mode: 'insensitive' } },
        { summary: { contains: filters.searchQuery, mode: 'insensitive' } },
        { authors: { hasSome: [filters.searchQuery] } },
      ];
    }

    const [papers, total] = await Promise.all([
      this.prisma.paper.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.paper.count({ where }),
    ]);

    return {
      papers: papers.map(PaperMapper.toDomain),
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
      data: updateData,
    });
    return PaperMapper.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.paper.delete({
      where: { id },
    });
  }

  async incrementViewCount(id: string): Promise<void> {
    await this.prisma.paper.update({
      where: { id },
      data: { totalViewCount: { increment: 1 } },
    });
  }

  async getCategories(): Promise<CategoryWithCount[]> {
    const papers = await this.prisma.paper.findMany({
      select: { categories: true },
    });

    const categoryMap = new Map<string, number>();
    papers.forEach((paper) => {
      paper.categories.forEach((category) => {
        categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
      });
    });

    return Array.from(categoryMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }

  async findByCategory(category: string, options: PaperListOptions): Promise<PaginatedPapers> {
    const { page, limit, sortBy = 'createdAt', sortOrder = 'desc' } = options;
    const skip = (page - 1) * limit;

    const where: Prisma.PaperWhereInput = {
      categories: { has: category },
    };

    const [papers, total] = await Promise.all([
      this.prisma.paper.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.paper.count({ where }),
    ]);

    return {
      papers: papers.map(PaperMapper.toDomain),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}



