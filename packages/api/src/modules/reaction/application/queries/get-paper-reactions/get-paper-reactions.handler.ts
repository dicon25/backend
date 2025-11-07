import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetPaperReactionsQuery } from './get-paper-reactions.query';
import { ReactionRepositoryPort, ReactionStats } from '../../../domain/repositories';

@QueryHandler(GetPaperReactionsQuery)
export class GetPaperReactionsHandler implements IQueryHandler<GetPaperReactionsQuery> {
  constructor(private readonly reactionRepository: ReactionRepositoryPort) {}

  async execute(query: GetPaperReactionsQuery): Promise<ReactionStats> {
    return await this.reactionRepository.getPaperStats(query.paperId);
  }
}



