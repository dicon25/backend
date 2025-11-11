import { DiscussionMessageEntity } from '../entities';

export interface PaginatedMessages {
  messages: DiscussionMessageEntity[];
  total: number;
  page:  number;
  limit: number;
}

export abstract class DiscussionMessageRepositoryPort {
  abstract create(data: Partial<DiscussionMessageEntity>): Promise<DiscussionMessageEntity>;
  abstract findById(id: string): Promise<DiscussionMessageEntity | null>;
  abstract findByDiscussion(
    discussionId: string,
    page: number,
    limit: number,
    userId?: string,
  ): Promise<PaginatedMessages>;
  abstract update(id: string, content: string): Promise<DiscussionMessageEntity>;
  abstract delete(id: string): Promise<void>;
}

