import { ReactionEntity, ReactionType } from '../entities';

export interface ReactionStats {
  likeCount: number;
  unlikeCount: number;
}

export abstract class ReactionRepositoryPort {
  abstract findByUserAndPaper(
    userId: string,
    paperId: string,
    type: ReactionType,
  ): Promise<ReactionEntity | null>;
  abstract findAllByUserAndPaper(userId: string, paperId: string): Promise<ReactionEntity[]>;
  abstract create(
    userId: string,
    paperId: string,
    type: ReactionType,
  ): Promise<ReactionEntity>;
  abstract delete(id: string): Promise<void>;
  abstract getPaperStats(paperId: string): Promise<ReactionStats>;
  abstract getUserReactions(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ reactions: ReactionEntity[]; total: number }>;
}



