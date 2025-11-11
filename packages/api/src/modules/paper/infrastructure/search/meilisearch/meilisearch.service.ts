import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MeiliSearch } from 'meilisearch';

@Injectable()
export class MeiliSearchService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MeiliSearchService.name);
  private client:             MeiliSearch | null = null;
  private readonly enabled:   boolean;
  private readonly indexName: string;

  constructor(private readonly configService: ConfigService) {
    this.enabled = this.configService.get<boolean>('MEILISEARCH_ENABLED', false);

    this.indexName = this.configService.get<string>('MEILISEARCH_INDEX_PAPERS', 'papers');
  }

  async onModuleInit() {
    if (!this.enabled) {
      return;
    }

    try {
      const host = this.configService.get<string>('MEILISEARCH_HOST');
      const apiKey = this.configService.get<string>('MEILISEARCH_API_KEY');

      if (!host) {
        throw new Error('MEILISEARCH_HOST is required');
      }

      /* MeiliSearch 클라이언트 초기화 - MeiliSearch SDK는 apiKey를 자동으로 Authorization 헤더에 포함시킵니다 */
      const clientOptions: {
        host: string; apiKey?: string;
      } = { host };

      if (apiKey && apiKey.trim()) {
        clientOptions.apiKey = apiKey.trim();
      }

      this.client = new MeiliSearch(clientOptions);

      // Test connection
      await this.client.health();
    } catch (error) {
      this.logger.error('Failed to connect to MeiliSearch', error);

      this.client = null;
    }
  }

  async onModuleDestroy() {
    // MeiliSearch client doesn't need explicit cleanup
    this.client = null;
  }

  getClient(): MeiliSearch | null {
    return this.client;
  }

  isEnabled(): boolean {
    return this.enabled && this.client !== null;
  }

  getIndexName(): string {
    return this.indexName;
  }
}
