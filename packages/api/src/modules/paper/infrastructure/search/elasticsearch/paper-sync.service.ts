import { Injectable, Logger } from '@nestjs/common';
import { ElasticsearchService } from './elasticsearch.service';
import { PaperIndexService } from './paper-index.service';
import { PaperEntity } from '../../../domain/entities';
import { Client } from '@elastic/elasticsearch';

@Injectable()
export class PaperSyncService {
  private readonly logger = new Logger(PaperSyncService.name);

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    private readonly paperIndexService: PaperIndexService,
  ) {}

  async indexPaper(paper: PaperEntity): Promise<void> {
    if (!this.elasticsearchService.isEnabled()) {
      return;
    }

    const client = this.elasticsearchService.getClient();
    if (!client) {
      return;
    }

    try {
      await this.paperIndexService.ensureIndexExists();

      const indexName = this.elasticsearchService.getIndexName();

      await client.index({
        index: indexName,
        id: paper.id,
        document: {
          id: paper.id,
          paperId: paper.paperId,
          title: paper.title,
          summary: paper.summary,
          authors: paper.authors,
          categories: paper.categories,
          doi: paper.doi,
          issuedAt: paper.issuedAt,
          createdAt: paper.createdAt,
          likeCount: paper.likeCount,
          totalViewCount: paper.totalViewCount,
        },
        refresh: false,
      });

      this.logger.debug(`Indexed paper: ${paper.id}`);
    } catch (error) {
      this.logger.error(`Failed to index paper: ${paper.id}`, error);
      // Don't throw - allow the operation to continue even if indexing fails
    }
  }

  async updatePaper(paperId: string, paper: Partial<PaperEntity>): Promise<void> {
    if (!this.elasticsearchService.isEnabled()) {
      return;
    }

    const client = this.elasticsearchService.getClient();
    if (!client) {
      return;
    }

    try {
      const indexName = this.elasticsearchService.getIndexName();

      const updateDoc: any = {};

      if (paper.title !== undefined) updateDoc.title = paper.title;
      if (paper.summary !== undefined) updateDoc.summary = paper.summary;
      if (paper.authors !== undefined) updateDoc.authors = paper.authors;
      if (paper.categories !== undefined) updateDoc.categories = paper.categories;
      if (paper.doi !== undefined) updateDoc.doi = paper.doi;
      if (paper.issuedAt !== undefined) updateDoc.issuedAt = paper.issuedAt;
      if (paper.likeCount !== undefined) updateDoc.likeCount = paper.likeCount;
      if (paper.totalViewCount !== undefined) updateDoc.totalViewCount = paper.totalViewCount;

      await client.update({
        index: indexName,
        id: paperId,
        doc: updateDoc,
        refresh: false,
      });

      this.logger.debug(`Updated paper in Elasticsearch: ${paperId}`);
    } catch (error) {
      this.logger.error(`Failed to update paper in Elasticsearch: ${paperId}`, error);
      // Don't throw - allow the operation to continue even if indexing fails
    }
  }

  async deletePaper(paperId: string): Promise<void> {
    if (!this.elasticsearchService.isEnabled()) {
      return;
    }

    const client = this.elasticsearchService.getClient();
    if (!client) {
      return;
    }

    try {
      const indexName = this.elasticsearchService.getIndexName();

      await client.delete({
        index: indexName,
        id: paperId,
        refresh: false,
      });

      this.logger.debug(`Deleted paper from Elasticsearch: ${paperId}`);
    } catch (error) {
      // If document doesn't exist, that's okay
      if (error.meta?.statusCode === 404) {
        return;
      }
      this.logger.error(`Failed to delete paper from Elasticsearch: ${paperId}`, error);
      // Don't throw - allow the operation to continue even if deletion fails
    }
  }
}

