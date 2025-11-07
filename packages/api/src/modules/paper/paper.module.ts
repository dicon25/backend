import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '@/common/modules/prisma';
import { ConfigModule } from '@nestjs/config';

// Commands
import { CreatePaperHandler, DeletePaperHandler } from './application/commands';

// Queries
import {
  GetPaperDetailHandler,
  ListPapersHandler,
  GetCategoriesHandler,
  ListPapersByCategoryHandler,
} from './application/queries';

// Facades
import { PaperFacade } from './application/facades';

// Infrastructure
import { PaperRepository } from './infrastructure/persistence';
import { PaperRepositoryPort } from './domain/repositories';

// Presentation
import { PaperController, PaperCrawlerController } from './presentation/controllers';
import { PaperRelationController } from './presentation/controllers/paper-relation.controller';

// Guards
import { CrawlerAuthGuard } from '@/common/guards';
import { UserModule } from '../user/user.module';
import { AssetModule } from '../asset';

const commandHandlers = [CreatePaperHandler, DeletePaperHandler];

const queryHandlers = [
  GetPaperDetailHandler,
  ListPapersHandler,
  GetCategoriesHandler,
  ListPapersByCategoryHandler,
];

@Module({
  imports: [CqrsModule, PrismaModule, ConfigModule, UserModule, AssetModule],
  providers: [
    ...commandHandlers,
    ...queryHandlers,
    PaperFacade,
    {
      provide: PaperRepositoryPort,
      useClass: PaperRepository,
    },
    CrawlerAuthGuard,
  ],
  controllers: [PaperController, PaperCrawlerController, PaperRelationController],
  exports: [PaperFacade],
})
export class PaperModule {}

