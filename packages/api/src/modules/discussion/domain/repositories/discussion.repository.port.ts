import { DiscussionEntity } from '../entities';

export interface PaginatedDiscussions {
  discussions: DiscussionEntity[];
  total: number;
  page: number;
  limit: number;
}

export abstract class DiscussionRepositoryPort {
  abstract create(data: Partial<DiscussionEntity>): Promise<DiscussionEntity>;
  abstract findById(id: string): Promise<DiscussionEntity | null>;
  abstract findByPaper(
    paperId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedDiscussions>;
  abstract updateCounts(discussionId: string): Promise<void>;
}



