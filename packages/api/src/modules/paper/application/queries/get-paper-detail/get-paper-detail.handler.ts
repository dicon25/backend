import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '@/common/modules/prisma';
import { PaperEntity } from '../../../domain/entities';
import { PaperRepositoryPort } from '../../../domain/repositories';
import { GetPaperDetailQuery } from './get-paper-detail.query';

export interface PaperDetailResult extends PaperEntity {
  myReaction?: {
    isLiked:   boolean;
    isUnliked: boolean;
  };
}

@QueryHandler(GetPaperDetailQuery)
export class GetPaperDetailHandler implements IQueryHandler<GetPaperDetailQuery> {
  constructor(private readonly paperRepository: PaperRepositoryPort,
    private readonly prisma: PrismaService) {
  }

  async execute(query: GetPaperDetailQuery): Promise<PaperDetailResult> {
    const paper = await this.paperRepository.findById(query.paperId);

    if (!paper) {
      throw new NotFoundException('Paper not found');
    }

    // Increment view count
    await this.paperRepository.incrementViewCount(paper.id);

    // Get user's reaction if logged in
    let myReaction: {
      isLiked: boolean; isUnliked: boolean;
    } | undefined;

    if (query.userId) {
      const reactions = await this.prisma.reaction.findMany({ where: {
        userId:  query.userId,
        paperId: paper.id,
      } });

      myReaction = {
        isLiked:   reactions.some(r => r.type === 'LIKE'),
        isUnliked: reactions.some(r => r.type === 'UNLIKE'),
      };

      // Note: VIEW_PAPER activity is no longer created here.
      // STAY_LONG_TIME activity is created when the user views the paper for a long time via recordPaperView endpoint.
    }

    return {
      ...paper,
      myReaction,
    };
  }
}

