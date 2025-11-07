import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '@/common/modules/prisma';

// Commands
import { ToggleReactionHandler } from './application/commands';

// Queries
import { GetPaperReactionsHandler, GetUserReactionsHandler } from './application/queries';

// Facades
import { ReactionFacade } from './application/facades';

// Infrastructure
import { ReactionRepository } from './infrastructure/persistence';
import { ReactionRepositoryPort } from './domain/repositories';

// Presentation
import { ReactionController } from './presentation/controllers';

// Other modules
import { UserModule } from '../user/user.module';

const commandHandlers = [ToggleReactionHandler];

const queryHandlers = [GetPaperReactionsHandler, GetUserReactionsHandler];

@Module({
  imports: [CqrsModule, PrismaModule, UserModule],
  providers: [
    ...commandHandlers,
    ...queryHandlers,
    ReactionFacade,
    {
      provide: ReactionRepositoryPort,
      useClass: ReactionRepository,
    },
  ],
  controllers: [ReactionController],
  exports: [ReactionFacade],
})
export class ReactionModule {}



