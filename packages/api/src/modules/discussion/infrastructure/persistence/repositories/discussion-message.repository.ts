import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/modules/prisma';
import { DiscussionMessageEntity } from '../../../domain/entities';
import { DiscussionMessageRepositoryPort } from '../../../domain/repositories';
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
    userId?: string): Promise<DiscussionMessageEntity[]> {
    const messages = await this.prisma.discussionMessage.findMany({
      where:   { discussionId },
      orderBy: { createdAt: 'asc' },
    });

    return messages.map(msg => DiscussionMessageMapper.toDomain(msg));
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

