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
import { ElasticsearchService } from '@/modules/paper/infrastructure/search/elasticsearch/elasticsearch.service';
import { PaperIndexService } from '@/modules/paper/infrastructure/search/elasticsearch/paper-index.service';
import { PaperSyncService } from '@/modules/paper/infrastructure/search/elasticsearch/paper-sync.service';
import { Public } from '@/modules/user/presentation/decorators';

@ApiTags('Papers - Admin')
@Controller('admin/papers')
@Public()
@UseGuards(CrawlerAuthGuard)
export class PaperAdminController {
  private readonly logger = new Logger(PaperAdminController.name);

  constructor(private readonly paperIndexService: PaperIndexService,
    private readonly paperSyncService: PaperSyncService,
    private readonly elasticsearchService: ElasticsearchService,
    private readonly prisma: PrismaService) {
  }

  @Get('elasticsearch/status')
  @ApiOperation({
    summary:     'Get Elasticsearch index status',
    description: 'Returns the current status of the Elasticsearch index including document count, mappings, and settings',
  })
  @ApiResponse({
    status: 200, description: 'Status retrieved successfully',
  })
  async getIndexStatus() {
    try {
      const enabled = this.elasticsearchService.isEnabled();

      if (!enabled) {
        return {
          enabled:       false,
          indexExists:   false,
          documentCount: 0,
          hasNoriPlugin: false,
          mappings:      null,
        };
      }

      const client = this.elasticsearchService.getClient();

      if (!client) {
        return {
          enabled:       false,
          indexExists:   false,
          documentCount: 0,
          hasNoriPlugin: false,
          mappings:      null,
        };
      }

      const indexName = this.elasticsearchService.getIndexName();
      const indexExists = await client.indices.exists({ index: indexName });

      let documentCount = 0;
      let mappings: Record<string, unknown> | null = null;
      let hasNoriPlugin = false;

      if (indexExists) {
        // Get document count
        const countResponse = await client.count({ index: indexName });

        documentCount = countResponse.count;

        // Get mappings
        const mappingResponse = await client.indices.getMapping({ index: indexName });

        mappings = mappingResponse[indexName]?.mappings as Record<string, unknown> | undefined || null;

        // Check if Nori plugin is available by testing analyzer
        try {
          await client.indices.analyze({
            index:    indexName,
            analyzer: 'korean_analyzer',
            text:     '테스트',
          });

          hasNoriPlugin = true;
        } catch {
          hasNoriPlugin = false;
        }
      }

      return {
        enabled: true,
        indexExists,
        documentCount,
        hasNoriPlugin,
        mappings,
      };
    } catch (error) {
      this.logger.error('Failed to get index status', error);

      throw error;
    }
  }

  @Post('elasticsearch/reindex')
  @ApiOperation({
    summary:     'Recreate Elasticsearch index and reindex all papers',
    description: 'Deletes the current index, creates a new one with updated mappings, and reindexes all papers',
  })
  @ApiResponse({
    status: 200, description: 'Reindexing completed successfully',
  })
  @ApiResponse({
    status: 500, description: 'Reindexing failed',
  })
  async reindexPapers() {
    try {
      this.logger.log('Starting Elasticsearch reindexing process');

      // Delete existing index
      await this.paperIndexService.deleteIndex();

      this.logger.log('Deleted existing index');

      // Create new index with updated mappings
      await this.paperIndexService.ensureIndexExists();

      this.logger.log('Created new index with updated mappings');

      // Fetch all papers from database
      const papers = await this.prisma.paper.findMany({ orderBy: { createdAt: 'asc' } });

      this.logger.log(`Found ${papers.length} papers to reindex`);

      // Reindex papers in batches
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

  @Post('elasticsearch/optimize')
  @ApiOperation({
    summary:     'Optimize Elasticsearch index',
    description: 'Forces a refresh and optimizes the index for better search performance',
  })
  @ApiResponse({
    status: 200, description: 'Optimization completed successfully',
  })
  async optimizeIndex() {
    try {
      const client = this.elasticsearchService.getClient();

      if (!client) {
        throw new Error('Elasticsearch client is not available');
      }

      const indexName = this.elasticsearchService.getIndexName();

      // Refresh index
      await client.indices.refresh({ index: indexName });

      // Force merge for optimization
      await client.indices.forcemerge({
        index:                indexName,
        max_num_segments:     1,
        only_expunge_deletes: false,
      });

      this.logger.log('Elasticsearch index optimized successfully');

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to optimize index', error);

      throw error;
    }
  }
}
