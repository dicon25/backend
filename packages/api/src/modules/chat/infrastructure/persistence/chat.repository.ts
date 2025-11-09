import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/modules/prisma';
import { ChatMessageEntity, ChatSessionEntity } from '../../domain/entities/chat.entities';
import { ChatRepositoryPort, PaginatedMessages, PaginatedSessions } from '../../domain/repositories/chat.repository.port';

@Injectable()
export class ChatRepository implements ChatRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
  }

  async createSession(userId: string, paperId?: string): Promise<ChatSessionEntity> {
    const session = await this.prisma.chatSession.create({ data: {
      userId, paperId,
    } });

    return new ChatSessionEntity({
      ...session,
      paperId: session.paperId ?? undefined,
    });
  }

  async findSessionById(id: string): Promise<ChatSessionEntity | null> {
    const session = await this.prisma.chatSession.findUnique({ where: { id } });

    return session
      ? new ChatSessionEntity({
        ...session,
        paperId: session.paperId ?? undefined,
      })
      : null;
  }

  async findUserSessions(userId: string): Promise<PaginatedSessions> {
    const sessions = await this.prisma.chatSession.findMany({
      where:   { userId },
      orderBy: { updatedAt: 'desc' },
    });

    return {
      sessions: sessions.map(s => new ChatSessionEntity({
        ...s,
        paperId: s.paperId ?? undefined,
      })),
      total: sessions.length,
    };
  }

  async createMessage(sessionId: string,
    content: string,
    role: string,
    referencedPaperIds: string[] = []): Promise<ChatMessageEntity> {
    const message = await this.prisma.chatMessage.create({ data: {
      chatSessionId: sessionId,
      content,
      role:          role as any,
      referencedPaperIds,
    } });

    return new ChatMessageEntity(message as any);
  }

  async findSessionMessages(sessionId: string,
    page: number,
    limit: number): Promise<PaginatedMessages> {
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.prisma.chatMessage.findMany({
        where:   { chatSessionId: sessionId },
        skip,
        take:    limit,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.chatMessage.count({ where: { chatSessionId: sessionId } }),
    ]);

    return {
      messages: messages.map(m => new ChatMessageEntity(m as any)),
      total,
    };
  }
}

