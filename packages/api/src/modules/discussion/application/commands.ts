import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DiscussionRepositoryPort, DiscussionMessageRepositoryPort } from '../domain/repositories';
import { DiscussionEntity, DiscussionMessageEntity } from '../domain/entities';
import { PrismaService } from '@/common/modules/prisma';

// Commands
export class CreateDiscussionCommand {
  constructor(
    public readonly paperId: string,
    public readonly title: string,
    public readonly content: string,
    public readonly creatorId: string,
  ) {}
}

export class CreateMessageCommand {
  constructor(
    public readonly discussionId: string,
    public readonly userId: string,
    public readonly content: string,
  ) {}
}

export class UpdateMessageCommand {
  constructor(
    public readonly messageId: string,
    public readonly userId: string,
    public readonly content: string,
  ) {}
}

export class DeleteMessageCommand {
  constructor(
    public readonly messageId: string,
    public readonly userId: string,
  ) {}
}

export class ToggleMessageLikeCommand {
  constructor(
    public readonly messageId: string,
    public readonly userId: string,
  ) {}
}

// Handlers
@CommandHandler(CreateDiscussionCommand)
export class CreateDiscussionHandler implements ICommandHandler<CreateDiscussionCommand> {
  constructor(
    private readonly discussionRepository: DiscussionRepositoryPort,
    private readonly prisma: PrismaService,
  ) {}

  async execute(command: CreateDiscussionCommand): Promise<DiscussionEntity> {
    const discussion = await this.discussionRepository.create({
      paperId: command.paperId,
      title: command.title,
      content: command.content,
      creatorId: command.creatorId,
    });

    await this.prisma.userActivity.create({
      data: {
        userId: command.creatorId,
        paperId: command.paperId,
        type: 'START_DISCUSSION',
      },
    });

    return discussion;
  }
}

@CommandHandler(CreateMessageCommand)
export class CreateMessageHandler implements ICommandHandler<CreateMessageCommand> {
  constructor(
    private readonly discussionRepository: DiscussionRepositoryPort,
    private readonly messageRepository: DiscussionMessageRepositoryPort,
    private readonly prisma: PrismaService,
  ) {}

  async execute(command: CreateMessageCommand): Promise<DiscussionMessageEntity> {
    const discussion = await this.discussionRepository.findById(command.discussionId);
    if (!discussion) {
      throw new NotFoundException('Discussion not found');
    }

    const message = await this.messageRepository.create({
      discussionId: command.discussionId,
      userId: command.userId,
      content: command.content,
    });

    await this.discussionRepository.updateCounts(command.discussionId);

    await this.prisma.userActivity.create({
      data: {
        userId: command.userId,
        paperId: discussion.paperId,
        type: 'JOIN_DISCUSSION',
      },
    });

    return message;
  }
}

@CommandHandler(UpdateMessageCommand)
export class UpdateMessageHandler implements ICommandHandler<UpdateMessageCommand> {
  constructor(private readonly messageRepository: DiscussionMessageRepositoryPort) {}

  async execute(command: UpdateMessageCommand): Promise<DiscussionMessageEntity> {
    const message = await this.messageRepository.findById(command.messageId);
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.userId !== command.userId) {
      throw new ForbiddenException('You can only edit your own messages');
    }

    return await this.messageRepository.update(command.messageId, command.content);
  }
}

@CommandHandler(DeleteMessageCommand)
export class DeleteMessageHandler implements ICommandHandler<DeleteMessageCommand> {
  constructor(
    private readonly messageRepository: DiscussionMessageRepositoryPort,
    private readonly discussionRepository: DiscussionRepositoryPort,
  ) {}

  async execute(command: DeleteMessageCommand): Promise<void> {
    const message = await this.messageRepository.findById(command.messageId);
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.userId !== command.userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    await this.messageRepository.delete(command.messageId);
    await this.discussionRepository.updateCounts(message.discussionId);
  }
}

@CommandHandler(ToggleMessageLikeCommand)
export class ToggleMessageLikeHandler implements ICommandHandler<ToggleMessageLikeCommand> {
  constructor(private readonly messageRepository: DiscussionMessageRepositoryPort) {}

  async execute(command: ToggleMessageLikeCommand): Promise<{ action: 'created' | 'deleted' }> {
    const message = await this.messageRepository.findById(command.messageId);
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    return await this.messageRepository.toggleLike(command.messageId, command.userId);
  }
}



