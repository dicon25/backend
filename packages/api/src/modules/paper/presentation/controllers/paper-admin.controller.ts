import {
  Controller,
  Get,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CrawlerAuthGuard } from '@/common/guards';
import { PrismaService } from '@/common/modules/prisma';
import { PaperMapper } from '@/modules/paper/infrastructure/persistence/mappers';
import { MeiliSearchService } from '@/modules/paper/infrastructure/search/meilisearch/meilisearch.service';
import { PaperIndexService } from '@/modules/paper/infrastructure/search/meilisearch/paper-index.service';
import { PaperSyncService } from '@/modules/paper/infrastructure/search/meilisearch/paper-sync.service';
import { Public } from '@/modules/user/presentation/decorators';

@ApiTags('Papers - Admin')
@Controller('admin/papers')
@Public()
@UseGuards(CrawlerAuthGuard)
export class PaperAdminController {
  private readonly logger = new Logger(PaperAdminController.name);

  constructor(private readonly paperIndexService: PaperIndexService,
    private readonly paperSyncService: PaperSyncService,
    private readonly meiliSearchService: MeiliSearchService,
    private readonly prisma: PrismaService) {
  }

  @Get('meilisearch/status')
  @ApiOperation({
    summary:     'Get MeiliSearch index status',
    description: 'Returns the current status of the MeiliSearch index including document count and settings',
  })
  @ApiResponse({
    status: 200, description: 'Status retrieved successfully',
  })
  async getIndexStatus() {
    try {
      const enabled = this.meiliSearchService.isEnabled();

      if (!enabled) {
        return {
          enabled:       false,
          indexExists:   false,
          documentCount: 0,
          settings:      null,
        };
      }

      const client = this.meiliSearchService.getClient();

      if (!client) {
        return {
          enabled:       false,
          indexExists:   false,
          documentCount: 0,
          settings:      null,
        };
      }

      const indexName = this.meiliSearchService.getIndexName();

      try {
        const index = client.index(indexName);
        const stats = await index.getStats();
        const settings = await index.getSettings();

        return {
          enabled:       true,
          indexExists:   true,
          documentCount: stats.numberOfDocuments,
          settings,
        };
      } catch {
        return {
          enabled:       true,
          indexExists:   false,
          documentCount: 0,
          settings:      null,
        };
      }
    } catch (error) {
      this.logger.error('Failed to get index status', error);

      throw error;
    }
  }

  @Post('meilisearch/reindex')
  @ApiOperation({
    summary:     'Reindex all papers in MeiliSearch',
    description: 'Deletes the existing index, recreates it, and reindexes all papers from the database',
  })
  @ApiResponse({
    status: 201, description: 'Reindexing completed successfully',
  })
  async reindexPapers() {
    try {
      this.logger.log('Starting MeiliSearch reindexing process');

      await this.paperIndexService.deleteIndex();

      this.logger.log('Deleted existing index');

      await this.paperIndexService.ensureIndexExists();

      this.logger.log('Created new index with updated settings');

      const papers = await this.prisma.paper.findMany({ orderBy: { createdAt: 'asc' } });

      this.logger.log(`Found ${papers.length} papers to reindex`);

      const batchSize = 100;

      let reindexedCount = 0;

      for (let i = 0; i < papers.length; i += batchSize) {
        const batch = papers.slice(i, i + batchSize);

        await Promise.all(batch.map(async paper => {
          try {
            const paperEntity = PaperMapper.toDomain(paper);

            await this.paperSyncService.indexPaper(paperEntity);

            reindexedCount++;
          } catch (error) {
            this.logger.error(`Failed to index paper ${paper.id}`, error);
          }
        }));

        this.logger.log(`Reindexed ${reindexedCount}/${papers.length} papers`);
      }

      this.logger.log(`Reindexing completed. Total papers reindexed: ${reindexedCount}`);

      return { reindexedCount };
    } catch (error) {
      this.logger.error('Reindexing failed', error);

      throw error;
    }
  }
}
