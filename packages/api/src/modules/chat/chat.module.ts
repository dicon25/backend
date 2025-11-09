import { Module } from '@nestjs/common';
import { PrismaModule } from '@/common/modules/prisma';
import { UserModule } from '../user/user.module';
import { ChatFacade } from './application/chat.facade';
import { ChatRepositoryPort } from './domain/repositories/chat.repository.port';
import { ChatRepository } from './infrastructure/persistence/chat.repository';
import { AiChatService } from './infrastructure/services/ai-chat.service';
import { ChatController } from './presentation/chat.controller';

@Module({
  imports:   [PrismaModule, UserModule],
  providers: [
    ChatFacade,
    {
      provide:  ChatRepositoryPort,
      useClass: ChatRepository,
    },
    AiChatService,
  ],
  controllers: [ChatController],
  exports:     [ChatFacade],
})
export class ChatModule {
}

