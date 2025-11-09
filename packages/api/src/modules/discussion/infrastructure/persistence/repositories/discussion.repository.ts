import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/modules/prisma';
import { DiscussionEntity } from '../../../domain/entities';
import { DiscussionRepositoryPort, PaginatedDiscussions } from '../../../domain/repositories';
import { DiscussionMapper } from '../mappers';

@Injectable()
export class DiscussionRepository implements DiscussionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
  }

  async create(data: Partial<DiscussionEntity>): Promise<DiscussionEntity> {
    const discussion = await this.prisma.discussion.create({ data: {
      paperId:   data.paperId!,
      title:     data.title!,
      content:   data.content!,
      creatorId: data.creatorId!,
    } });

    return DiscussionMapper.toDomain(discussion);
  }

  async findById(id: string): Promise<DiscussionEntity | null> {
    const discussion = await this.prisma.discussion.findUnique({ where: { id } });

    return discussion ? DiscussionMapper.toDomain(discussion) : null;
  }

  async findByPaper(paperId: string,
    page: number,
    limit: number): Promise<PaginatedDiscussions> {
    const skip = (page - 1) * limit;

    const [discussions, total] = await Promise.all([
      this.prisma.discussion.findMany({
        where:   { paperId },
        skip,
        take:    limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.discussion.count({ where: { paperId } }),
    ]);

    return {
      discussions: discussions.map(DiscussionMapper.toDomain),
      total,
      page,
      limit,
    };
  }

  async updateCounts(discussionId: string): Promise<void> {
    const [messageCount, uniqueUsers] = await Promise.all([
      this.prisma.discussionMessage.count({ where: { discussionId } }),
      this.prisma.discussionMessage.findMany({
        where:    { discussionId },
        select:   { userId: true },
        distinct: ['userId'],
      }),
    ]);

    await this.prisma.discussion.update({
      where: { id: discussionId },
      data:  {
        messageCount,
        participantCount: uniqueUsers.length,
      },
    });
  }
}

