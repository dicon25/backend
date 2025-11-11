import { Discussion, DiscussionMessage } from '@scholub/database';
import { DiscussionEntity, DiscussionMessageEntity } from '../../../domain/entities';

export class DiscussionMapper {
  static toDomain(discussion: Discussion): DiscussionEntity {
    return new DiscussionEntity({
      id:               discussion.id,
      paperId:          discussion.paperId,
      title:            discussion.title,
      content:          discussion.content,
      creatorId:        discussion.creatorId,
      participantCount: discussion.participantCount,
      messageCount:     discussion.messageCount,
      createdAt:        discussion.createdAt,
      updatedAt:        discussion.updatedAt,
    });
  }
}

export class DiscussionMessageMapper {
  static toDomain(message: DiscussionMessage): DiscussionMessageEntity {
    return new DiscussionMessageEntity({
      id:           message.id,
      discussionId: message.discussionId,
      userId:       message.userId,
      content:      message.content,
      isEdited:     message.isEdited,
      createdAt:    message.createdAt,
      updatedAt:    message.updatedAt,
    });
  }
}

