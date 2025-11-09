import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/modules/prisma';
import { ChatMessageEntity, ChatMessageRole, ChatSessionEntity } from '../domain/entities/chat.entities';
import { ChatRepositoryPort } from '../domain/repositories/chat.repository.port';
import { AiChatService } from '../infrastructure/services/ai-chat.service';

@Injectable()
export class ChatFacade {
  constructor(private readonly chatRepository: ChatRepositoryPort,
    private readonly aiChatService: AiChatService,
    private readonly prisma: PrismaService) {
  }

  async createSession(userId: string, paperId?: string): Promise<ChatSessionEntity> {
    return await this.chatRepository.createSession(userId, paperId);
  }

  async getUserSessions(userId: string) {
    return await this.chatRepository.findUserSessions(userId);
  }

  async getSessionDetail(sessionId: string, userId: string): Promise<ChatSessionEntity> {
    const session = await this.chatRepository.findSessionById(sessionId);

    if (!session) {
      throw new NotFoundException('Chat session not found');
    }

    if (session.userId !== userId) {
      throw new NotFoundException('Chat session not found');
    }

    return session;
  }

  async sendMessage(sessionId: string, userId: string, content: string): Promise<{
    userMessage: ChatMessageEntity;
    aiMessage:   ChatMessageEntity;
  }> {
    const session = await this.chatRepository.findSessionById(sessionId);

    if (!session) {
      throw new NotFoundException('Chat session not found');
    }

    if (session.userId !== userId) {
      throw new NotFoundException('Chat session not found');
    }

    // Save user message
    const userMessage = await this.chatRepository.createMessage(sessionId,
      content,
      ChatMessageRole.USER);

    // Generate AI response (mock data)
    const aiResponse = await this.aiChatService.generateResponse(content, session.paperId);

    // Save AI message
    const aiMessage = await this.chatRepository.createMessage(sessionId,
      aiResponse,
      ChatMessageRole.ASSISTANT);

    // Create user activity
    if (session.paperId) {
      await this.prisma.userActivity.create({ data: {
        userId,
        paperId: session.paperId,
        type:    'CHAT_MESSAGE',
      } });
    }

    return {
      userMessage, aiMessage,
    };
  }

  async getSessionMessages(sessionId: string, userId: string, page: number, limit: number) {
    const session = await this.chatRepository.findSessionById(sessionId);

    if (!session) {
      throw new NotFoundException('Chat session not found');
    }

    if (session.userId !== userId) {
      throw new NotFoundException('Chat session not found');
    }

    return await this.chatRepository.findSessionMessages(sessionId, page, limit);
  }
}

