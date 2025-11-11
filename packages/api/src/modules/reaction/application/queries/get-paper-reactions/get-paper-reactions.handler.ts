import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/modules/prisma';
import { ReactionRepositoryPort, ReactionStats } from '../../../domain/repositories';
import { GetPaperReactionsQuery } from './get-paper-reactions.query';

@QueryHandler(GetPaperReactionsQuery)
export class GetPaperReactionsHandler implements IQueryHandler<GetPaperReactionsQuery> {
  constructor(private readonly reactionRepository: ReactionRepositoryPort,
    private readonly prisma: PrismaService) {
  }

  async execute(query: GetPaperReactionsQuery): Promise<ReactionStats> {
    // Find paper by paperId field (not PK)
    const paper = await this.prisma.paper.findUnique({
      where: { paperId: query.paperId },
    });

    if (!paper) {
      throw new NotFoundException(`Paper not found with paperId: ${query.paperId}`);
    }

    return await this.reactionRepository.getPaperStats(paper.id);
  }
}

