import { Reaction } from '@scholub/database';
import { ReactionEntity, ReactionType } from '../../../domain/entities';

export class ReactionMapper {
  static toDomain(reaction: Reaction): ReactionEntity {
    return new ReactionEntity({
      id:        reaction.id,
      userId:    reaction.userId,
      paperId:   reaction.paperId,
      type:      reaction.type as ReactionType,
      createdAt: reaction.createdAt,
    });
  }
}

