export class DiscussionMessageEntity {
  id:           string;
  discussionId: string;
  userId:       string;
  content:      string;
  isEdited:     boolean;
  createdAt:    Date;
  updatedAt:    Date;

  constructor(data: DiscussionMessageEntity) {
    Object.assign(this, data);
  }
}

