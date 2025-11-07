import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '@/common/modules/prisma';

// Commands & Queries
import {
  CreateDiscussionHandler,
  CreateMessageHandler,
  UpdateMessageHandler,
  DeleteMessageHandler,
  ToggleMessageLikeHandler,
} from './application/commands';
import {
  GetDiscussionDetailHandler,
  ListDiscussionsByPaperHandler,
  ListDiscussionMessagesHandler,
} from './application/queries';

// Facade
import { DiscussionFacade } from './application/discussion.facade';

// Infrastructure
import {
  DiscussionRepository,
  DiscussionMessageRepository,
} from './infrastructure/persistence';
import {
  DiscussionRepositoryPort,
  DiscussionMessageRepositoryPort,
} from './domain/repositories';

// Presentation
import { DiscussionController } from './presentation/discussion.controller';

// Other modules
import { UserModule } from '../user/user.module';

const commandHandlers = [
  CreateDiscussionHandler,
  CreateMessageHandler,
  UpdateMessageHandler,
  DeleteMessageHandler,
  ToggleMessageLikeHandler,
];

const queryHandlers = [
  GetDiscussionDetailHandler,
  ListDiscussionsByPaperHandler,
  ListDiscussionMessagesHandler,
];

@Module({
  imports: [CqrsModule, PrismaModule, UserModule],
  providers: [
    ...commandHandlers,
    ...queryHandlers,
    DiscussionFacade,
    {
      provide: DiscussionRepositoryPort,
      useClass: DiscussionRepository,
    },
    {
      provide: DiscussionMessageRepositoryPort,
      useClass: DiscussionMessageRepository,
    },
  ],
  controllers: [DiscussionController],
  exports: [DiscussionFacade],
})
export class DiscussionModule {}



