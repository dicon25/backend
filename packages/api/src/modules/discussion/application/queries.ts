import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { DiscussionEntity } from '../domain/entities';
import {
  DiscussionMessageRepositoryPort,
  DiscussionRepositoryPort,
  PaginatedDiscussions,
  PaginatedMessages,
} from '../domain/repositories';

// Queries
export class GetDiscussionDetailQuery {
  constructor(public readonly discussionId: string) {
  }
}

export class ListDiscussionsByPaperQuery {
  constructor(public readonly paperId: string,
    public readonly page: number,
    public readonly limit: number) {
  }
}

export class ListDiscussionMessagesQuery {
  constructor(public readonly discussionId: string,
    public readonly page: number,
    public readonly limit: number,
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

  async execute(query: ListDiscussionsByPaperQuery): Promise<PaginatedDiscussions> {
    return await this.discussionRepository.findByPaper(query.paperId,
      query.page,
      query.limit);
  }
}

@QueryHandler(ListDiscussionMessagesQuery)
export class ListDiscussionMessagesHandler
implements IQueryHandler<ListDiscussionMessagesQuery> {
  constructor(private readonly discussionRepository: DiscussionRepositoryPort,
    private readonly messageRepository: DiscussionMessageRepositoryPort) {
  }

  async execute(query: ListDiscussionMessagesQuery): Promise<PaginatedMessages> {
    const discussion = await this.discussionRepository.findById(query.discussionId);

    if (!discussion) {
      throw new NotFoundException('Discussion not found');
    }

    return await this.messageRepository.findByDiscussion(query.discussionId,
      query.page,
      query.limit,
      query.userId);
  }
}

