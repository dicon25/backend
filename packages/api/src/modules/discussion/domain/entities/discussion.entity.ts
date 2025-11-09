export class DiscussionEntity {
  id:               string;
  paperId:          string;
  title:            string;
  content:          string;
  creatorId:        string;
  participantCount: number;
  messageCount:     number;
  createdAt:        Date;
  updatedAt:        Date;

  constructor(data: DiscussionEntity) {
    Object.assign(this, data);
  }
}

