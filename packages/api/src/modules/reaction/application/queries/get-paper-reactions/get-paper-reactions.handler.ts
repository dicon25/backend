import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ReactionRepositoryPort, ReactionStats } from '../../../domain/repositories';
import { GetPaperReactionsQuery } from './get-paper-reactions.query';

@QueryHandler(GetPaperReactionsQuery)
export class GetPaperReactionsHandler implements IQueryHandler<GetPaperReactionsQuery> {
  constructor(private readonly reactionRepository: ReactionRepositoryPort) {
  }

  async execute(query: GetPaperReactionsQuery): Promise<ReactionStats> {
    return await this.reactionRepository.getPaperStats(query.paperId);
  }
}

