import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { DiscussionEntity, DiscussionMessageEntity } from '../domain/entities';
import {
  DiscussionMessageRepositoryPort,
  DiscussionRepositoryPort,
} from '../domain/repositories';

// Queries
export class GetDiscussionDetailQuery {
  constructor(public readonly discussionId: string) {
  }
}

export class ListDiscussionsByPaperQuery {
  constructor(public readonly paperId: string) {
  }
}

export class ListDiscussionMessagesQuery {
  constructor(public readonly discussionId: string,
    public readonly userId?: string) {
  }
}

// Handlers
@QueryHandler(GetDiscussionDetailQuery)
export class GetDiscussionDetailHandler implements IQueryHandler<GetDiscussionDetailQuery> {
  constructor(private readonly discussionRepository: DiscussionRepositoryPort) {
  }

  async execute(query: GetDiscussionDetailQuery): Promise<DiscussionEntity> {
    const discussion = await this.discussionRepository.findById(query.discussionId);

    if (!discussion) {
      throw new NotFoundException('Discussion not found');
    }

    return discussion;
  }
}

@QueryHandler(ListDiscussionsByPaperQuery)
export class ListDiscussionsByPaperHandler
implements IQueryHandler<ListDiscussionsByPaperQuery> {
  constructor(private readonly discussionRepository: DiscussionRepositoryPort) {
  }

  async execute(query: ListDiscussionsByPaperQuery): Promise<DiscussionEntity[]> {
    return await this.discussionRepository.findByPaper(query.paperId);
  }
}

@QueryHandler(ListDiscussionMessagesQuery)
export class ListDiscussionMessagesHandler
implements IQueryHandler<ListDiscussionMessagesQuery> {
  constructor(private readonly discussionRepository: DiscussionRepositoryPort,
    private readonly messageRepository: DiscussionMessageRepositoryPort) {
  }

  async execute(query: ListDiscussionMessagesQuery): Promise<DiscussionMessageEntity[]> {
    const discussion = await this.discussionRepository.findById(query.discussionId);

    if (!discussion) {
      throw new NotFoundException('Discussion not found');
    }

    return await this.messageRepository.findByDiscussion(query.discussionId, query.userId);
  }
}

