import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, ClientOptions } from '@elastic/elasticsearch';

@Injectable()
export class ElasticsearchService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ElasticsearchService.name);
  private client: Client | null = null;
  private readonly enabled: boolean;
  private readonly indexName: string;

  constructor(private readonly configService: ConfigService) {
    this.enabled = this.configService.get<boolean>('ELASTICSEARCH_ENABLED', false);
    this.indexName = this.configService.get<string>('ELASTICSEARCH_INDEX_PAPERS', 'papers');
  }

  async onModuleInit() {
    if (!this.enabled) {
      this.logger.warn('Elasticsearch is disabled');
      return;
    }

    try {
      const node = this.configService.get<string>('ELASTICSEARCH_NODE');
      const username = this.configService.get<string>('ELASTICSEARCH_USERNAME');
      const password = this.configService.get<string>('ELASTICSEARCH_PASSWORD');

      const clientOptions: ClientOptions = {
        node,
      };

      if (username && password) {
        clientOptions.auth = {
          username,
          password,
        };
      }

      this.client = new Client(clientOptions);

      // Test connection
      await this.client.ping();
      this.logger.log(`Connected to Elasticsearch at ${node}`);
    } catch (error) {
      this.logger.error('Failed to connect to Elasticsearch', error);
      this.client = null;
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.close();
    }
  }

  getClient(): Client | null {
    return this.client;
  }

  isEnabled(): boolean {
    return this.enabled && this.client !== null;
  }

  getIndexName(): string {
    return this.indexName;
  }
}

