export enum ChatMessageRole {
  USER = 'USER',
  ASSISTANT = 'ASSISTANT',
  SYSTEM = 'SYSTEM',
}

export class ChatSessionEntity {
  id: string;
  userId: string;
  paperId?: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: ChatSessionEntity) {
    Object.assign(this, data);
  }
}

export class ChatMessageEntity {
  id: string;
  chatSessionId: string;
  content: string;
  role: ChatMessageRole;
  referencedPaperIds: string[];
  createdAt: Date;

  constructor(data: ChatMessageEntity) {
    Object.assign(this, data);
  }
}



