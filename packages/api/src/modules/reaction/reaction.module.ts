import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '@/common/modules/prisma';
// Other modules
import { UserModule } from '../user/user.module';
// Commands
import { ToggleReactionHandler } from './application/commands';
// Facades
import { ReactionFacade } from './application/facades';
// Queries
import { GetPaperReactionsHandler, GetUserReactionsHandler } from './application/queries';
import { ReactionRepositoryPort } from './domain/repositories';
// Infrastructure
import { ReactionRepository } from './infrastructure/persistence';
// Presentation
import { ReactionController } from './presentation/controllers';

const commandHandlers = [ToggleReactionHandler];const queryHandlers = [GetPaperReactionsHandler, GetUserReactionsHandler];

@Module({
  imports: [
    CqrsModule, PrismaModule, UserModule,
  ],
  providers: [
    ...commandHandlers,
    ...queryHandlers,
    ReactionFacade,
    {
      provide:  ReactionRepositoryPort,
      useClass: ReactionRepository,
    },
  ],
  controllers: [ReactionController],
  exports:     [ReactionFacade],
})
export class ReactionModule {
}

