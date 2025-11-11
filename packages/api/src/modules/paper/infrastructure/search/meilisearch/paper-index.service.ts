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
       * 4. hashtags - 태그 기반 검색
       * 5. categories - 카테고리 (분야별 검색)
       * 6. authors - 저자명 (저자 검색)
       */
      await index.updateSearchableAttributes([
        'title',
        'translatedSummary',
        'summary',
        'hashtags',
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

      // Ranking Rules - 관련성 기반 순위 결정
      await index.updateRankingRules([
        'words',       // 쿼리의 모든 단어가 포함된 문서 우선
        'typo',        // 오타가 적은 문서 우선
        'proximity',   // 쿼리 단어들이 가까이 있는 문서 우선
        'attribute',   // searchableAttributes 순서대로 우선순위
        'sort',        // 정렬 기준 (최신순, 인기순 등)
        'exactness',   // 정확히 일치하는 문서 우선
      ]);

      // Filterable/Sortable attributes
      await index.updateFilterableAttributes([
        'categories',
        'authors',
        'hashtags',
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

      /*
       * Separator Tokens - 기본 구분자 사용 (공백, 콤마, 마침표 등)
       * 빈 배열로 설정하면 기본 구분자만 사용
       */
      await index.updateSeparatorTokens([]);

      /*
       * Non Separator Tokens - 학술 용어의 특수 문자 처리
       * 하이픈, 밑줄, 슬래시를 단어의 일부로 처리
       * 예: "machine-learning", "deep_learning", "AI/ML" 등이 하나의 토큰으로 처리됨
       */
      await index.updateNonSeparatorTokens([
        '-',
        '_',
        '/',
      ]);

      /*
       * Stop Words - 최소한의 불용어만 설정
       * 한국어와 영어의 가장 일반적인 조사/관사만 포함
       * 학술 논문의 검색 품질을 위해 불용어를 최소화
       */
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
