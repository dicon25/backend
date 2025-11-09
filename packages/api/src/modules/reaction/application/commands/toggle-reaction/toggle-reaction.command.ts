import { DataClass } from 'dataclasses';
import { ReactionType } from '../../../domain/entities';

export class ToggleReactionCommand extends DataClass {
  userId:  string;
  paperId: string;
  type:    ReactionType;
}

