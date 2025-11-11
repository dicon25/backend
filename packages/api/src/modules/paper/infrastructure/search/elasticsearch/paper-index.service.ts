import { Injectable, Logger } from '@nestjs/common';
import { ElasticsearchService } from './elasticsearch.service';

@Injectable()
export class PaperIndexService {
  private readonly logger = new Logger(PaperIndexService.name);

  constructor(private readonly elasticsearchService: ElasticsearchService) {
  }

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
      index:    indexName,
      settings: {
        number_of_shards:   1,
        number_of_replicas: 1,
        analysis:           {
          tokenizer: { nori_mixed: {
            type:            'nori_tokenizer',
            decompound_mode: 'mixed',
          } },
          filter: {
            korean_stop: {
              type:     'nori_part_of_speech',
              stoptags: [
                'EP',   // 선어말어미
                'EF',   // 종결어미
                'EC',   // 연결어미
                'ETM',  // 관형형전성어미
                'ETN',  // 명사형전성어미
                'IC',   // 감탄사
                'JX',   // 보조사
                'JC',   // 접속조사
                'MAG',  // 일반부사
                'MAJ',  // 접속부사
                'MM',   // 관형사
                'SP',   // 공백
                'SSC',  // 닫는괄호
                'SSO',  // 여는괄호
                'SC',   // 구분자
                'SE',   // 줄임표
                'XPN',  // 체언접두사
                'XSA',  // 형용사파생접미사
                'XSN',  // 명사파생접미사
                'XSV',  // 동사파생접미사
              ],
            },
            korean_synonym: {
              type:     'synonym',
              lenient:  true,  // 토큰화 충돌 문제 해결
              synonyms: [

                // 영어 중심 동의어 (토큰화 문제 회피)
                'machine learning,ml => 머신러닝',
                'deep learning,dl => 딥러닝',
                'artificial intelligence,ai => 인공지능',
                'neural network,nn => 신경망',
                'natural language processing,nlp => 자연어처리',
                'computer vision,cv => 컴퓨터비전',
                'reinforcement learning,rl => 강화학습',
                'shortest path,shortest distance => 최단거리',
                'graph => 그래프',
                'algorithm => 알고리즘',
                'data structure => 자료구조',
                'big data => 빅데이터',
                'cloud => 클라우드',
                'distributed system => 분산시스템',
                'blockchain => 블록체인',
                'internet of things,iot => 사물인터넷',
              ],
            },
            english_stop: {
              type:      'stop',
              stopwords: '_english_',
            },
            english_stemmer: {
              type:     'stemmer',
              language: 'english',
            },
          },
          analyzer: {
            korean_analyzer: {
              type:      'custom',
              tokenizer: 'nori_mixed',
              filter:    [
                'lowercase',
                'korean_stop',

                // synonym은 별도 필드에서 처리
              ],
            },
            korean_synonym_analyzer: {
              type:      'custom',
              tokenizer: 'standard',  // Nori 대신 standard 사용
              filter:    [
                'lowercase',
                'korean_synonym',
              ],
            },
            english_analyzer: {
              type:      'custom',
              tokenizer: 'standard',
              filter:    [
                'lowercase',
                'english_stop',
                'english_stemmer',
              ],
            },
            mixed_analyzer: {
              type:      'custom',
              tokenizer: 'standard',
              filter:    [
                'lowercase',
                'korean_synonym',  // mixed analyzer에서 synonym 처리
              ],
            },
            category_analyzer: {
              type:      'custom',
              tokenizer: 'keyword',
              filter:    ['lowercase'],
            },
          },
        },
      },
      mappings: { properties: {
        id:      { type: 'keyword' },
        paperId: { type: 'keyword' },
        title:   {
          type:     'text',
          analyzer: 'mixed_analyzer',
          fields:   {
            korean: {
              type:     'text',
              analyzer: 'korean_analyzer',
            },
            english: {
              type:     'text',
              analyzer: 'english_analyzer',
            },
            keyword: { type: 'keyword' },
          },
        },
        summary: {
          type:     'text',
          analyzer: 'mixed_analyzer',
          fields:   {
            korean: {
              type:     'text',
              analyzer: 'korean_analyzer',
            },
            english: {
              type:     'text',
              analyzer: 'english_analyzer',
            },
          },
        },
        translatedSummary: {
          type:     'text',
          analyzer: 'korean_analyzer',
          fields:   { standard: {
            type:     'text',
            analyzer: 'mixed_analyzer',
          } },
        },
        authors: {
          type:     'text',
          analyzer: 'standard',
          fields:   { keyword: { type: 'keyword' } },
        },
        categories: {
          type:   'keyword',
          fields: { text: {
            type:     'text',
            analyzer: 'category_analyzer',
          } },
        },
        doi:            { type: 'keyword' },
        issuedAt:       { type: 'date' },
        createdAt:      { type: 'date' },
        likeCount:      { type: 'integer' },
        totalViewCount: { type: 'integer' },
      } },
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

  async reindexData(): Promise<void> {
    if (!this.elasticsearchService.isEnabled()) {
      return;
    }

    const client = this.elasticsearchService.getClient();

    if (!client) {
      return;
    }

    const indexName = this.elasticsearchService.getIndexName();
    const tempIndexName = `${indexName}_temp`;

    try {
      // Create new index with improved mappings
      await this.createIndex();

      // Check if old index exists
      const oldIndexExists = await client.indices.exists({ index: tempIndexName });

      if (oldIndexExists) {
        // Reindex data from old to new
        await client.reindex({
          source: { index: tempIndexName },
          dest:   { index: indexName },
        });

        // Delete old index
        await client.indices.delete({ index: tempIndexName });

        this.logger.log(`Reindexed data from ${tempIndexName} to ${indexName}`);
      }
    } catch (error) {
      this.logger.error('Failed to reindex data', error);

      throw error;
    }
  }
}
