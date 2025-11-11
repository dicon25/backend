import { Injectable, Logger } from '@nestjs/common';
import { PaperEntity } from '@/modules/paper/domain/entities';
import { MeiliSearchService } from './meilisearch.service';
import { PaperIndexService } from './paper-index.service';

@Injectable()
export class PaperSyncService {
  private readonly logger = new Logger(PaperSyncService.name);

  constructor(
    private readonly meiliSearchService: MeiliSearchService,
    private readonly paperIndexService: PaperIndexService,
  ) {
  }

  async indexPaper(paper: PaperEntity): Promise<void> {
    if (!this.meiliSearchService.isEnabled()) {
      return;
    }

    const client = this.meiliSearchService.getClient();

    if (!client) {
      return;
    }

    try {
      await this.paperIndexService.ensureIndexExists();

      const indexName = this.meiliSearchService.getIndexName();
      const index = client.index(indexName);

      await index.addDocuments([
        {
          id:                paper.id,
          paperId:           paper.paperId,
          title:             paper.title,
          summary:           paper.summary,
          translatedSummary: paper.translatedSummary,
          authors:           paper.authors,
          categories:        paper.categories,
          hashtags:          paper.hashtags,
          doi:               paper.doi,
          issuedAt:          paper.issuedAt ? paper.issuedAt.toISOString() : null,
          createdAt:         paper.createdAt.toISOString(),
          likeCount:         paper.likeCount,
          totalViewCount:    paper.totalViewCount,
        },
      ]);

      this.logger.debug(`Indexed paper: ${paper.id}`);
    } catch (error) {
      this.logger.error(`Failed to index paper: ${paper.id}`, error);

      // Don't throw - allow the operation to continue even if indexing fails
    }
  }

  async updatePaper(paperId: string, paper: Partial<PaperEntity>): Promise<void> {
    if (!this.meiliSearchService.isEnabled()) {
      return;
    }

    const client = this.meiliSearchService.getClient();

    if (!client) {
      return;
    }

    try {
      const indexName = this.meiliSearchService.getIndexName();
      const index = client.index(indexName);

      const updateDoc: Record<string, unknown> = {
        id: paperId,
      };

      if (paper.title !== undefined) updateDoc.title = paper.title;
      if (paper.summary !== undefined) updateDoc.summary = paper.summary;
      if (paper.translatedSummary !== undefined) updateDoc.translatedSummary = paper.translatedSummary;
      if (paper.authors !== undefined) updateDoc.authors = paper.authors;
      if (paper.categories !== undefined) updateDoc.categories = paper.categories;
      if (paper.hashtags !== undefined) updateDoc.hashtags = paper.hashtags;
      if (paper.doi !== undefined) updateDoc.doi = paper.doi;
      if (paper.issuedAt !== undefined) updateDoc.issuedAt = paper.issuedAt ? paper.issuedAt.toISOString() : null;
      if (paper.likeCount !== undefined) updateDoc.likeCount = paper.likeCount;
      if (paper.totalViewCount !== undefined) updateDoc.totalViewCount = paper.totalViewCount;

      await index.updateDocuments([updateDoc]);

      this.logger.debug(`Updated paper in MeiliSearch: ${paperId}`);
    } catch (error) {
      this.logger.error(`Failed to update paper in MeiliSearch: ${paperId}`, error);

      // Don't throw - allow the operation to continue even if indexing fails
    }
  }

  async deletePaper(paperId: string): Promise<void> {
    if (!this.meiliSearchService.isEnabled()) {
      return;
    }

    const client = this.meiliSearchService.getClient();

    if (!client) {
      return;
    }

    try {
      const indexName = this.meiliSearchService.getIndexName();
      const index = client.index(indexName);

      await index.deleteDocument(paperId);

      this.logger.debug(`Deleted paper from MeiliSearch: ${paperId}`);
    } catch (error) {
      this.logger.error(`Failed to delete paper from MeiliSearch: ${paperId}`, error);

      // Don't throw - allow the operation to continue even if indexing fails
    }
  }
}
