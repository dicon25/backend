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
      // Create index
      await client.createIndex(indexName, { primaryKey: 'id' });

      const index = client.index(indexName);

      // Configure searchable attributes (검색 가능한 필드) - 우선순위 설정
      await index.updateSearchableAttributes([
        'title',              // 제목이 가장 중요
        'translatedSummary',  // 한국어 번역본
        'summary',            // 원문 요약
        'authors',            // 저자
        'categories',         // 카테고리
      ]);

      // Configure displayed attributes (반환할 필드)
      await index.updateDisplayedAttributes([
        'id',
        'paperId',
        'title',
        'summary',
        'translatedSummary',
        'authors',
        'categories',
        'doi',
        'issuedAt',
        'createdAt',
        'likeCount',
        'totalViewCount',
      ]);

      // Configure filterable attributes (필터링 가능한 필드)
      await index.updateFilterableAttributes([
        'categories',
        'authors',
        'issuedAt',
        'createdAt',
        'likeCount',
        'totalViewCount',
      ]);

      // Configure sortable attributes (정렬 가능한 필드)
      await index.updateSortableAttributes([
        'issuedAt',
        'createdAt',
        'likeCount',
        'totalViewCount',
      ]);

      // Configure ranking rules (한국어 검색 최적화)
      await index.updateRankingRules([
        'words',
        'typo',
        'proximity',
        'attribute',
        'sort',
        'exactness',
      ]);

      // Configure typo tolerance (한국어 타이포 톨러런스)
      await index.updateTypoTolerance({
        enabled:             true,
        minWordSizeForTypos: {
          oneTypo:  3,  // 한국어는 짧은 단어도 검색되도록
          twoTypos: 6,
        },
        disableOnWords:      [],  // 모든 단어에 타이포 톨러런스 적용
        disableOnAttributes: [],  // 모든 속성에 적용
      });

      // Configure stop words (한국어 불용어)
      await index.updateStopWords([
        '은',
        '는',
        '이',
        '가',
        '을',
        '를',
        '의',
        '에',
        '와',
        '과',
        '도',
        '로',
        '으로',
        '에서',
        '에게',
        '께',
        'the',
        'a',
        'an',
        'and',
        'or',
        'but',
        'in',
        'on',
        'at',
        'to',
        'for',
        'of',
        'with',
      ]);

      this.logger.log(`Created MeiliSearch index: ${indexName}`);
    } catch (error) {
      this.logger.error(`Failed to create index: ${indexName}`, error);

      throw error;
    }
  }

  private async updateIndexSettings(index: Index): Promise<void> {
    try {
      await index.updateSearchableAttributes([
        'title',
        'translatedSummary',
        'summary',
        'authors',
        'categories',
      ]);

      await index.updateDisplayedAttributes([
        'id',
        'paperId',
        'title',
        'summary',
        'translatedSummary',
        'authors',
        'categories',
        'doi',
        'issuedAt',
        'createdAt',
        'likeCount',
        'totalViewCount',
      ]);

      await index.updateTypoTolerance({
        enabled:             true,
        minWordSizeForTypos: {
          oneTypo:  3,
          twoTypos: 6,
        },
        disableOnWords:      [],  // 모든 단어에 타이포 톨러런스 적용
        disableOnAttributes: [],  // 모든 속성에 적용
      });

      // Configure stop words (한국어 불용어)
      await index.updateStopWords([
        '은',
        '는',
        '이',
        '가',
        '을',
        '를',
        '의',
        '에',
        '와',
        '과',
        '도',
        '로',
        '으로',
        '에서',
        '에게',
        '께',
        'the',
        'a',
        'an',
        'and',
        'or',
        'but',
        'in',
        'on',
        'at',
        'to',
        'for',
        'of',
        'with',
      ]);

      this.logger.debug('Updated MeiliSearch index settings for Korean search optimization');
    } catch (error) {
      this.logger.warn('Failed to update index settings', error);

      // Don't throw - allow the operation to continue
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
