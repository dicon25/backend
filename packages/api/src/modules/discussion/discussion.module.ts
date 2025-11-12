import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '@/common/modules/prisma';
// Other modules
import { NotificationModule } from '../notification';
import { UserModule } from '../user/user.module';
// Commands & Queries
import {
  CreateDiscussionHandler,
  CreateMessageHandler,
  DeleteMessageHandler,
  UpdateMessageHandler,
} from './application/commands';
// Facade
import { DiscussionFacade } from './application/discussion.facade';
import { GetDiscussionDetailHandler, ListDiscussionMessagesHandler, ListDiscussionsByPaperHandler } from './application/queries';
import { DiscussionMessageRepositoryPort, DiscussionRepositoryPort } from './domain/repositories';
// Infrastructure
import { DiscussionMessageRepository, DiscussionRepository } from './infrastructure/persistence';
// Presentation
import { DiscussionController } from './presentation/discussion.controller';

const commandHandlers = [
  CreateDiscussionHandler,
  CreateMessageHandler,
  UpdateMessageHandler,
  DeleteMessageHandler,
];

const queryHandlers = [
  GetDiscussionDetailHandler,
  ListDiscussionsByPaperHandler,
  ListDiscussionMessagesHandler,
];

@Module({
  imports: [
    CqrsModule, PrismaModule, UserModule, NotificationModule,
  ],
  providers: [
    ...commandHandlers,
    ...queryHandlers,
    DiscussionFacade,
    {
      provide:  DiscussionRepositoryPort,
      useClass: DiscussionRepository,
    },
    {
      provide:  DiscussionMessageRepositoryPort,
      useClass: DiscussionMessageRepository,
    },
  ],
  controllers: [DiscussionController],
  exports:     [DiscussionFacade],
})
export class DiscussionModule {
}

