import { Injectable } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { DiscussionEntity, DiscussionMessageEntity } from '../domain/entities';
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

  async listDiscussionsByPaper(paperId: string): Promise<DiscussionEntity[]> {
    return await this.queryBus.execute(new ListDiscussionsByPaperQuery(paperId));
  }

  async createMessage(discussionId: string,
    userId: string,
    content: string): Promise<DiscussionMessageEntity> {
    return await this.commandBus.execute(new CreateMessageCommand(discussionId, userId, content));
  }

  async listMessages(discussionId: string,
    userId?: string): Promise<DiscussionMessageEntity[]> {
    return await this.queryBus.execute(new ListDiscussionMessagesQuery(discussionId, userId));
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

