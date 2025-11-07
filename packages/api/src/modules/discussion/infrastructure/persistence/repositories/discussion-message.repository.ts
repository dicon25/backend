import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/modules/prisma';
import {
  DiscussionMessageRepositoryPort,
  PaginatedMessages,
} from '../../../domain/repositories';
import { DiscussionMessageEntity } from '../../../domain/entities';
import { DiscussionMessageMapper } from '../mappers';

@Injectable()
export class DiscussionMessageRepository implements DiscussionMessageRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Partial<DiscussionMessageEntity>): Promise<DiscussionMessageEntity> {
    const message = await this.prisma.discussionMessage.create({
      data: {
        discussionId: data.discussionId!,
        userId: data.userId!,
        content: data.content!,
      },
    });
    return DiscussionMessageMapper.toDomain(message);
  }

  async findById(id: string): Promise<DiscussionMessageEntity | null> {
    const message = await this.prisma.discussionMessage.findUnique({
      where: { id },
    });
    return message ? DiscussionMessageMapper.toDomain(message) : null;
  }

  async findByDiscussion(
    discussionId: string,
    page: number,
    limit: number,
    userId?: string,
  ): Promise<PaginatedMessages> {
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.prisma.discussionMessage.findMany({
        where: { discussionId },
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
        include: userId ? { likes: { where: { userId } } } : undefined,
      }),
      this.prisma.discussionMessage.count({ where: { discussionId } }),
    ]);

    return {
      messages: messages.map((msg: any) => ({
        ...DiscussionMessageMapper.toDomain(msg),
        isLikedByMe: userId ? (msg.likes?.length ?? 0) > 0 : undefined,
      })),
      total,
      page,
      limit,
    };
  }

  async update(id: string, content: string): Promise<DiscussionMessageEntity> {
    const message = await this.prisma.discussionMessage.update({
      where: { id },
      data: { content, isEdited: true },
    });
    return DiscussionMessageMapper.toDomain(message);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.discussionMessage.delete({
      where: { id },
    });
  }

  async toggleLike(messageId: string, userId: string): Promise<{ action: 'created' | 'deleted' }> {
    return await this.prisma.$transaction(async (tx) => {
      const existingLike = await tx.discussionMessageLike.findUnique({
        where: { userId_messageId: { userId, messageId } },
      });

      if (existingLike) {
        await tx.discussionMessageLike.delete({
          where: { id: existingLike.id },
        });
        await tx.discussionMessage.update({
          where: { id: messageId },
          data: { likeCount: { decrement: 1 } },
        });
        return { action: 'deleted' };
      } else {
        await tx.discussionMessageLike.create({
          data: { userId, messageId },
        });
        await tx.discussionMessage.update({
          where: { id: messageId },
          data: { likeCount: { increment: 1 } },
        });
        return { action: 'created' };
      }
    });
  }
}



