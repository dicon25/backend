import { Injectable, Logger } from '@nestjs/common';
import { Index } from 'meilisearch';
import { MeiliSearchService } from './meilisearch.service';

@Injectable()
export class PaperIndexService {
  private readonly logger = new Logger(PaperIndexService.name);

  constructor(private readonly meiliSearchService: MeiliSearchService) {
  }

  async ensureIndexExists(): Promise<boolean> {
    if (!this.meiliSearchService.isEnabled()) {
      return false;
    }

    const client = this.meiliSearchService.getClient();

    if (!client) {
      return false;
    }

    try {
      const indexName = this.meiliSearchService.getIndexName();
      const index = client.index(indexName);

      // Check if index exists
      try {
        await index.getRawInfo();

        this.logger.debug(`Index ${indexName} already exists`);

        // 인덱스가 존재하더라도 설정을 업데이트 (한국어 검색 최적화)
        await this.updateIndexSettings(index);

        return true;
      } catch {
        // Index doesn't exist, create it
        await this.createIndex();

        return true;
      }
    } catch (error) {
      this.logger.error(`Failed to ensure index exists: ${this.meiliSearchService.getIndexName()}`, error);

      return false;
    }
  }

  private async createIndex(): Promise<void> {
    const client = this.meiliSearchService.getClient();

    if (!client) {
      throw new Error('MeiliSearch client is not available');
    }

    const indexName = this.meiliSearchService.getIndexName();

    try {
      await client.createIndex(indexName, { primaryKey: 'id' });

      const index = client.index(indexName);

      await this.updateIndexSettings(index);

      this.logger.log(`Created MeiliSearch index: ${indexName}`);
    } catch (error) {
      this.logger.error(`Failed to create index: ${indexName}`, error);

      throw error;
    }
  }

  private async updateIndexSettings(index: Index): Promise<void> {
    try {
      /*
       * 학술 논문 검색에 최적화된 searchable attributes 우선순위
       * 1. title - 제목이 가장 중요 (논문의 핵심)
       * 2. translatedSummary - 한국어 번역본 (한국어 검색 시 가장 중요)
       * 3. summary - 원문 요약 (영어 검색 시 중요)
       * 4. hashtags - 영어 태그 기반 검색
       * 5. translatedHashtags - 한국어 태그 기반 검색
       * 6. categories - 카테고리 (분야별 검색)
       * 7. authors - 저자명 (저자 검색)
       */
      await index.updateSearchableAttributes([
        'title',
        'translatedSummary',
        'summary',
        'hashtags',
        'translatedHashtags',
        'categories',
        'authors',
      ]);

      await index.updateDisplayedAttributes([
        'id',
        'paperId',
        'title',
        'summary',
        'translatedSummary',
        'authors',
        'categories',
        'hashtags',
        'translatedHashtags',
        'doi',
        'issuedAt',
        'createdAt',
        'likeCount',
        'totalViewCount',
      ]);

      await index.updateTypoTolerance({
        enabled:             true,
        minWordSizeForTypos: {
          oneTypo:  4,
          twoTypos: 8,
        },
        disableOnWords:      [],
        disableOnAttributes: [
          'authors',
          'categories',
        ],
      });

      await index.updateRankingRules([
        'words',
        'typo',
        'proximity',
        'attribute',
        'sort',
        'exactness',
      ]);

      await index.updateFilterableAttributes([
        'categories',
        'authors',
        'hashtags',
        'translatedHashtags',
        'paperId',
        'doi',
        'issuedAt',
        'createdAt',
        'likeCount',
        'totalViewCount',
      ]);

      await index.updateSortableAttributes([
        'issuedAt',
        'createdAt',
        'likeCount',
        'totalViewCount',
      ]);

      await index.updateSeparatorTokens([]);

      await index.updateNonSeparatorTokens([
        '-',
        '_',
        '/',
      ]);

      await index.updateStopWords([
        '은',
        '는',
        '이',
        '가',
        'the',
        'a',
        'an',
      ]);

      this.logger.log('Updated MeiliSearch index settings for academic paper search optimization');
    } catch (error) {
      this.logger.warn('Failed to update index settings', error);
    }
  }

  async deleteIndex(): Promise<void> {
    const client = this.meiliSearchService.getClient();

    if (!client) {
      throw new Error('MeiliSearch client is not available');
    }

    const indexName = this.meiliSearchService.getIndexName();

    try {
      await client.deleteIndex(indexName);

      this.logger.log(`Deleted MeiliSearch index: ${indexName}`);
    } catch (error) {
      this.logger.error(`Failed to delete index: ${indexName}`, error);

      throw error;
    }
  }
}
