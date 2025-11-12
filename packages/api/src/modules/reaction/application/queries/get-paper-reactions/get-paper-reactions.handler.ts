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
    // Find paper by id (PK)
    const paper = await this.prisma.paper.findUnique({
      where: { id: query.paperId },
    });

    if (!paper) {
      throw new NotFoundException(`Paper not found with id: ${query.paperId}`);
    }

    return await this.reactionRepository.getPaperStats(paper.id);
  }
}

