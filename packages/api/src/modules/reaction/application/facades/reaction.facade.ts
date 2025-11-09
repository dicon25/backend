import { Injectable } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ReactionEntity, ReactionType } from '../../domain/entities';
import { ReactionStats } from '../../domain/repositories';
import { ToggleReactionCommand } from '../commands';
import { GetPaperReactionsQuery, GetUserReactionsQuery } from '../queries';

@Injectable()
export class ReactionFacade {
  constructor(private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus) {
  }

  async toggleReaction(userId: string,
    paperId: string,
    type: ReactionType): Promise<{
    action: 'created' | 'deleted';
  }> {
    return await this.commandBus.execute(new ToggleReactionCommand(userId, paperId, type));
  }

  async getPaperReactions(paperId: string): Promise<ReactionStats> {
    return await this.queryBus.execute(new GetPaperReactionsQuery(paperId));
  }

  async getUserReactions(userId: string,
    page: number,
    limit: number): Promise<{
    reactions: ReactionEntity[]; total: number;
  }> {
    return await this.queryBus.execute(new GetUserReactionsQuery(userId, page, limit));
  }
}

