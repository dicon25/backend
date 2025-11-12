import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { CrawlerAuthGuard } from '@/common/guards';
import { PrismaModule, PrismaService } from '@/common/modules/prisma';
import { AssetModule } from '../asset';
import { NotificationModule } from '../notification';
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
import {
  MeiliSearchService,
  PaperIndexService,
  PaperSearchRepository,
  PaperSyncService,
} from './infrastructure/search/meilisearch';
import { PaperController, PaperCrawlerController } from './presentation/controllers';
import { PaperAdminController } from './presentation/controllers/paper-admin.controller';
import { PaperChatController } from './presentation/controllers/paper-chat.controller';
import { PaperRelationController } from './presentation/controllers/paper-relation.controller';
import { UserCrawlerController } from './presentation/controllers/user-crawler.controller';

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
    CqrsModule,
    PrismaModule,
    ConfigModule,
    UserModule,
    AssetModule,
    NotificationModule,
  ],
  providers: [
    ...commandHandlers,
    ...queryHandlers,
    PaperFacade,
    MeiliSearchService,
    PaperIndexService,
    PaperSyncService,
    PaperSearchRepository,
    {
      provide:    PaperRepositoryPort,
      useFactory: (prisma: PrismaService, paperSearchRepository: PaperSearchRepository, paperSyncService: PaperSyncService) => {
        return new PaperRepository(prisma, paperSearchRepository, paperSyncService);
      },
      inject: [
        PrismaService, PaperSearchRepository, PaperSyncService,
      ],
    },
    CrawlerAuthGuard,
  ],
  controllers: [
    PaperController,
    PaperCrawlerController,
    PaperAdminController,
    PaperRelationController,
    PaperChatController,
    UserCrawlerController,
  ],
  exports: [PaperFacade],
})
export class PaperModule {
}

