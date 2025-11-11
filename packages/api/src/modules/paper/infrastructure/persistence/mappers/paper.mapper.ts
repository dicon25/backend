import { Paper, Prisma } from '@scholub/database';
import { PaperEntity } from '@/modules/paper/domain/entities';

export class PaperMapper {
  static toDomain(paper: Paper): PaperEntity {
    return new PaperEntity({
      id:                 paper.id,
      paperId:            paper.paperId,
      title:              paper.title,
      categories:         paper.categories,
      authors:            paper.authors,
      summary:            paper.summary,
      translatedSummary:  paper.translatedSummary ?? undefined,
      content:            paper.content,
      hashtags:           paper.hashtags ?? [],
      translatedHashtags: paper.translatedHashtags ?? [],
      doi:                paper.doi,
      url:                paper.url ?? undefined,
      pdfUrl:             paper.pdfUrl ?? undefined,
      issuedAt:           paper.issuedAt ?? undefined,
      likeCount:          paper.likeCount,
      unlikeCount:        paper.unlikeCount,
      totalViewCount:     paper.totalViewCount,
      thumbnailId:        paper.thumbnailId ?? undefined,
      pdfId:              paper.pdfId,
      createdAt:          paper.createdAt,
      updatedAt:          paper.updatedAt,
    });
  }

  static toPersistence(entity: Partial<PaperEntity>): Partial<Prisma.PaperCreateInput> {
    const data: Partial<Prisma.PaperCreateInput> = {
      paperId:            entity.paperId,
      title:              entity.title,
      categories:         entity.categories,
      authors:            entity.authors,
      summary:            entity.summary,
      translatedSummary:  entity.translatedSummary,
      content:            entity.content as Prisma.InputJsonValue,
      hashtags:           entity.hashtags ?? [],
      translatedHashtags: entity.translatedHashtags ?? [],
      doi:                entity.doi,
      url:                entity.url,
      pdfUrl:             entity.pdfUrl,
      issuedAt:           entity.issuedAt,
    };

    if (entity.pdfId) {
      data.pdf = { connect: { id: entity.pdfId } };
    }

    if (entity.thumbnailId) {
      data.thumbnail = { connect: { id: entity.thumbnailId } };
    }

    return data;
  }
}

