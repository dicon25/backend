import { DiscussionEntity } from '../entities';

export abstract class DiscussionRepositoryPort {
  abstract create(data: Partial<DiscussionEntity>): Promise<DiscussionEntity>;
  abstract findById(id: string): Promise<DiscussionEntity | null>;
  abstract findByPaper(paperId: string): Promise<DiscussionEntity[]>;
  abstract updateCounts(discussionId: string): Promise<void>;
}

