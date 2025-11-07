import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/modules/prisma';
import { ReactionRepositoryPort, ReactionStats } from '../../../domain/repositories';
import { ReactionEntity, ReactionType } from '../../../domain/entities';
import { ReactionMapper } from '../mappers';

@Injectable()
export class ReactionRepository implements ReactionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserAndPaper(
    userId: string,
    paperId: string,
    type: ReactionType,
  ): Promise<ReactionEntity | null> {
    const reaction = await this.prisma.reaction.findUnique({
      where: {
        userId_paperId_type: {
          userId,
          paperId,
          type,
        },
      },
    });
    return reaction ? ReactionMapper.toDomain(reaction) : null;
  }

  async findAllByUserAndPaper(userId: string, paperId: string): Promise<ReactionEntity[]> {
    const reactions = await this.prisma.reaction.findMany({
      where: {
        userId,
        paperId,
      },
    });
    return reactions.map(ReactionMapper.toDomain);
  }

  async create(userId: string, paperId: string, type: ReactionType): Promise<ReactionEntity> {
    const reaction = await this.prisma.reaction.create({
      data: {
        userId,
        paperId,
        type,
      },
    });
    return ReactionMapper.toDomain(reaction);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.reaction.delete({
      where: { id },
    });
  }

  async getPaperStats(paperId: string): Promise<ReactionStats> {
    const [likeCount, unlikeCount] = await Promise.all([
      this.prisma.reaction.count({
        where: { paperId, type: 'LIKE' },
      }),
      this.prisma.reaction.count({
        where: { paperId, type: 'UNLIKE' },
      }),
    ]);

    return { likeCount, unlikeCount };
  }

  async getUserReactions(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ reactions: ReactionEntity[]; total: number }> {
    const skip = (page - 1) * limit;

    const [reactions, total] = await Promise.all([
      this.prisma.reaction.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.reaction.count({ where: { userId } }),
    ]);

    return {
      reactions: reactions.map(ReactionMapper.toDomain),
      total,
    };
  }
}



