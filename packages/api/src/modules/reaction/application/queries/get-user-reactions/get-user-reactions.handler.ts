import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetUserReactionsQuery } from './get-user-reactions.query';
import { ReactionRepositoryPort } from '../../../domain/repositories';
import { ReactionEntity } from '../../../domain/entities';

@QueryHandler(GetUserReactionsQuery)
export class GetUserReactionsHandler implements IQueryHandler<GetUserReactionsQuery> {
  constructor(private readonly reactionRepository: ReactionRepositoryPort) {}

  async execute(query: GetUserReactionsQuery): Promise<{ reactions: ReactionEntity[]; total: number }> {
    return await this.reactionRepository.getUserReactions(query.userId, query.page, query.limit);
  }
}



