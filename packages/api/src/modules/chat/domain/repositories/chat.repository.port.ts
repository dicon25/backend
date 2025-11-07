import { ChatSessionEntity, ChatMessageEntity } from '../entities/chat.entities';

export interface PaginatedSessions {
  sessions: ChatSessionEntity[];
  total: number;
}

export interface PaginatedMessages {
  messages: ChatMessageEntity[];
  total: number;
}

export abstract class ChatRepositoryPort {
  abstract createSession(userId: string, paperId?: string): Promise<ChatSessionEntity>;
  abstract findSessionById(id: string): Promise<ChatSessionEntity | null>;
  abstract findUserSessions(userId: string): Promise<PaginatedSessions>;
  abstract createMessage(
    sessionId: string,
    content: string,
    role: string,
    referencedPaperIds?: string[],
  ): Promise<ChatMessageEntity>;
  abstract findSessionMessages(
    sessionId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedMessages>;
}



