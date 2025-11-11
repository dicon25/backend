import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/modules/prisma';
import { DiscussionMessageEntity } from '../../../domain/entities';
import { DiscussionMessageRepositoryPort, PaginatedMessages } from '../../../domain/repositories';
import { DiscussionMessageMapper } from '../mappers';

@Injectable()
export class DiscussionMessageRepository implements DiscussionMessageRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
  }

  async create(data: Partial<DiscussionMessageEntity>): Promise<DiscussionMessageEntity> {
    const message = await this.prisma.discussionMessage.create({ data: {
      discussionId: data.discussionId!,
      userId:       data.userId!,
      content:      data.content!,
    } });

    return DiscussionMessageMapper.toDomain(message);
  }

  async findById(id: string): Promise<DiscussionMessageEntity | null> {
    const message = await this.prisma.discussionMessage.findUnique({ where: { id } });

    return message ? DiscussionMessageMapper.toDomain(message) : null;
  }

  async findByDiscussion(discussionId: string,
    page: number,
    limit: number,
    userId?: string): Promise<PaginatedMessages> {
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.prisma.discussionMessage.findMany({
        where:   { discussionId },
        skip,
        take:    limit,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.discussionMessage.count({ where: { discussionId } }),
    ]);

    return {
      messages: messages.map(msg => DiscussionMessageMapper.toDomain(msg)),
      total,
      page,
      limit,
    };
  }

  async update(id: string, content: string): Promise<DiscussionMessageEntity> {
    const message = await this.prisma.discussionMessage.update({
      where: { id },
      data:  {
        content, isEdited: true,
      },
    });

    return DiscussionMessageMapper.toDomain(message);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.discussionMessage.delete({ where: { id } });
  }
}

