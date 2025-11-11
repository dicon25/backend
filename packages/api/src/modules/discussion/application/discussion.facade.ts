import { Injectable } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { DiscussionEntity, DiscussionMessageEntity } from '../domain/entities';
import { PaginatedDiscussions, PaginatedMessages } from '../domain/repositories';
import {
  CreateDiscussionCommand,
  CreateMessageCommand,
  DeleteMessageCommand,
  UpdateMessageCommand,
} from './commands';
import { GetDiscussionDetailQuery, ListDiscussionMessagesQuery, ListDiscussionsByPaperQuery } from './queries';

@Injectable()
export class DiscussionFacade {
  constructor(private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus) {
  }

  async createDiscussion(paperId: string,
    title: string,
    content: string,
    creatorId: string): Promise<DiscussionEntity> {
    return await this.commandBus.execute(new CreateDiscussionCommand(paperId, title, content, creatorId));
  }

  async getDiscussionDetail(discussionId: string): Promise<DiscussionEntity> {
    return await this.queryBus.execute(new GetDiscussionDetailQuery(discussionId));
  }

  async listDiscussionsByPaper(paperId: string,
    page: number,
    limit: number): Promise<PaginatedDiscussions> {
    return await this.queryBus.execute(new ListDiscussionsByPaperQuery(paperId, page, limit));
  }

  async createMessage(discussionId: string,
    userId: string,
    content: string): Promise<DiscussionMessageEntity> {
    return await this.commandBus.execute(new CreateMessageCommand(discussionId, userId, content));
  }

  async listMessages(discussionId: string,
    page: number,
    limit: number,
    userId?: string): Promise<PaginatedMessages> {
    return await this.queryBus.execute(new ListDiscussionMessagesQuery(discussionId, page, limit, userId));
  }

  async updateMessage(messageId: string,
    userId: string,
    content: string): Promise<DiscussionMessageEntity> {
    return await this.commandBus.execute(new UpdateMessageCommand(messageId, userId, content));
  }

  async deleteMessage(messageId: string, userId: string): Promise<void> {
    return await this.commandBus.execute(new DeleteMessageCommand(messageId, userId));
  }
}

