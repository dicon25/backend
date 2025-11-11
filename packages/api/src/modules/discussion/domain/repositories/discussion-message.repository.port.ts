import { DiscussionMessageEntity } from '../entities';

export abstract class DiscussionMessageRepositoryPort {
  abstract create(data: Partial<DiscussionMessageEntity>): Promise<DiscussionMessageEntity>;
  abstract findById(id: string): Promise<DiscussionMessageEntity | null>;
  abstract findByDiscussion(
    discussionId: string,
    userId?: string,
  ): Promise<DiscussionMessageEntity[]>;
  abstract update(id: string, content: string): Promise<DiscussionMessageEntity>;
  abstract delete(id: string): Promise<void>;
}

