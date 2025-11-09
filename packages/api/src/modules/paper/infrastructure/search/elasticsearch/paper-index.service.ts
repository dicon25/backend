import { Injectable, Logger } from '@nestjs/common';
import { ElasticsearchService } from './elasticsearch.service';
import { Client } from '@elastic/elasticsearch';

@Injectable()
export class PaperIndexService {
  private readonly logger = new Logger(PaperIndexService.name);

  constructor(private readonly elasticsearchService: ElasticsearchService) {}

  async ensureIndexExists(): Promise<boolean> {
    if (!this.elasticsearchService.isEnabled()) {
      return false;
    }

    const client = this.elasticsearchService.getClient();
    if (!client) {
      return false;
    }

    const indexName = this.elasticsearchService.getIndexName();

    try {
      const exists = await client.indices.exists({ index: indexName });

      if (!exists) {
        await this.createIndex();
        this.logger.log(`Created Elasticsearch index: ${indexName}`);
      }

      return true;
    } catch (error) {
      this.logger.error(`Failed to ensure index exists: ${indexName}`, error);
      return false;
    }
  }

  private async createIndex(): Promise<void> {
    const client = this.elasticsearchService.getClient();
    if (!client) {
      throw new Error('Elasticsearch client is not available');
    }

    const indexName = this.elasticsearchService.getIndexName();

    await client.indices.create({
      index: indexName,
      mappings: {
        properties: {
          id: { type: 'keyword' },
          paperId: { type: 'keyword' },
          title: {
            type: 'text',
            analyzer: 'standard',
            fields: {
              keyword: { type: 'keyword' },
            },
          },
          summary: {
            type: 'text',
            analyzer: 'standard',
          },
          authors: {
            type: 'text',
            fields: {
              keyword: { type: 'keyword' },
            },
          },
          categories: {
            type: 'keyword',
          },
          doi: { type: 'keyword' },
          issuedAt: { type: 'date' },
          createdAt: { type: 'date' },
          likeCount: { type: 'integer' },
          totalViewCount: { type: 'integer' },
        },
      },
      settings: {
        number_of_shards: 1,
        number_of_replicas: 1,
      },
    });
  }

  async deleteIndex(): Promise<void> {
    if (!this.elasticsearchService.isEnabled()) {
      return;
    }

    const client = this.elasticsearchService.getClient();
    if (!client) {
      return;
    }

    const indexName = this.elasticsearchService.getIndexName();

    try {
      const exists = await client.indices.exists({ index: indexName });
      if (exists) {
        await client.indices.delete({ index: indexName });
        this.logger.log(`Deleted Elasticsearch index: ${indexName}`);
      }
    } catch (error) {
      this.logger.error(`Failed to delete index: ${indexName}`, error);
    }
  }
}

