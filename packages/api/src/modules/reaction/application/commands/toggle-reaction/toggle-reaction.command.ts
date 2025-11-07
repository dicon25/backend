import { ReactionType } from '../../../domain/entities';

export class ToggleReactionCommand {
  constructor(
    public readonly userId: string,
    public readonly paperId: string,
    public readonly type: ReactionType,
  ) {}
}



