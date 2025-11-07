import { Paper } from '@scholub/database';
import { PaperEntity } from '../../../domain/entities';

export class PaperMapper {
  static toDomain(paper: Paper): PaperEntity {
    return new PaperEntity({
      id: paper.id,
      paperId: paper.paperId,
      title: paper.title,
      categories: paper.categories,
      authors: paper.authors,
      summary: paper.summary,
      content: paper.content,
      doi: paper.doi,
      url: paper.url ?? undefined,
      pdfUrl: paper.pdfUrl ?? undefined,
      issuedAt: paper.issuedAt ?? undefined,
      likeCount: paper.likeCount,
      unlikeCount: paper.unlikeCount,
      totalViewCount: paper.totalViewCount,
      thumbnailId: paper.thumbnailId ?? undefined,
      pdfId: paper.pdfId,
      createdAt: paper.createdAt,
      updatedAt: paper.updatedAt,
    });
  }

  static toPersistence(entity: Partial<PaperEntity>) {
    const data: any = {
      paperId: entity.paperId,
      title: entity.title,
      categories: entity.categories,
      authors: entity.authors,
      summary: entity.summary,
      content: entity.content,
      doi: entity.doi,
      url: entity.url,
      pdfUrl: entity.pdfUrl,
      issuedAt: entity.issuedAt,
      thumbnailId: entity.thumbnailId,
    };

    if (entity.pdfId) {
      data.pdf = { connect: { id: entity.pdfId } };
    }

    return data;
  }
}



