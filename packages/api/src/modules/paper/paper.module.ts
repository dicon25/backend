import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { CrawlerAuthGuard } from '@/common/guards';
import { PrismaModule } from '@/common/modules/prisma';
import { AssetModule } from '../asset';
import { UserModule } from '../user/user.module';
import { CreatePaperHandler, DeletePaperHandler, RecordPaperViewHandler } from './application/commands';
import { PaperFacade } from './application/facades';
import {
  GetCategoriesHandler,
  GetHeadlinePapersHandler,
  GetLatestPapersHandler,
  GetMyDiscussedPapersHandler,
  GetMyReactedPapersHandler,
  GetMyRecommendedPapersHandler,
  GetPaperDetailHandler,
  GetPopularPapersHandler,
  ListPapersByCategoryHandler,
  ListPapersHandler,
} from './application/queries';
import { PaperRepositoryPort } from './domain/repositories';
import { PaperRepository } from './infrastructure/persistence';
import { PaperController, PaperCrawlerController } from './presentation/controllers';
import { PaperRelationController } from './presentation/controllers/paper-relation.controller';

const commandHandlers = [
  CreatePaperHandler,
  DeletePaperHandler,
  RecordPaperViewHandler,
];

const queryHandlers = [
  GetPaperDetailHandler,
  ListPapersHandler,
  GetCategoriesHandler,
  ListPapersByCategoryHandler,
  GetHeadlinePapersHandler,
  GetPopularPapersHandler,
  GetLatestPapersHandler,
  GetMyReactedPapersHandler,
  GetMyDiscussedPapersHandler,
  GetMyRecommendedPapersHandler,
];

@Module({
  imports: [
    CqrsModule, PrismaModule, ConfigModule, UserModule, AssetModule,
  ],
  providers: [
    ...commandHandlers,
    ...queryHandlers,
    PaperFacade,
    {
      provide:  PaperRepositoryPort,
      useClass: PaperRepository,
    },
    CrawlerAuthGuard,
  ],
  controllers: [
    PaperController, PaperCrawlerController, PaperRelationController,
  ],
  exports: [PaperFacade],
})
export class PaperModule {
}

