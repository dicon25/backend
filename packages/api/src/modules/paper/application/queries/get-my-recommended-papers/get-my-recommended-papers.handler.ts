import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Prisma } from '@scholub/database';
import { PrismaService } from '@/common/modules/prisma';
import { GetMyRecommendedPapersQuery } from './get-my-recommended-papers.query';

type PaperResult = {
  id:             string;
  paperId:        string;
  title:          string;
  categories:     string[];
  authors:        string[];
  summary:        string;
  content:        Prisma.JsonValue;
  doi:            string;
  url?:           string;
  pdfUrl?:        string;
  issuedAt?:      Date;
  likeCount:      number;
  unlikeCount:    number;
  totalViewCount: number;
  thumbnailId?:   string;
  pdfId:          string;
  createdAt:      Date;
  updatedAt:      Date;
};

@QueryHandler(GetMyRecommendedPapersQuery)
export class GetMyRecommendedPapersHandler implements IQueryHandler<GetMyRecommendedPapersQuery> {
  constructor(private readonly prisma: PrismaService) {
  }

  async execute(query: GetMyRecommendedPapersQuery): Promise<PaperResult[]> {
    // Get recommended papers for user
    const recommendations = await this.prisma.userRecommendation.findMany({
      where:  { userId: query.userId },
      include: { paper: true },
    });

    // Sort by paper's issuedAt (or createdAt if issuedAt is null), then by recommendation createdAt
    const sortedRecommendations = recommendations.sort((a, b) => {
      const aDate = a.paper.issuedAt ?? a.paper.createdAt;
      const bDate = b.paper.issuedAt ?? b.paper.createdAt;
      return bDate.getTime() - aDate.getTime();
    });

    // Take limit
    const limitedRecommendations = sortedRecommendations.slice(0, query.limit);

    // Map to result format
    return limitedRecommendations.map(rec => ({
      id:             rec.paper.id,
      paperId:        rec.paper.paperId,
      title:          rec.paper.title,
      categories:     rec.paper.categories,
      authors:        rec.paper.authors,
      summary:        rec.paper.summary,
      content:        rec.paper.content,
      doi:            rec.paper.doi,
      url:            rec.paper.url ?? undefined,
      pdfUrl:         rec.paper.pdfUrl ?? undefined,
      issuedAt:       rec.paper.issuedAt ?? undefined,
      likeCount:      rec.paper.likeCount,
      unlikeCount:    rec.paper.unlikeCount,
      totalViewCount: rec.paper.totalViewCount,
      thumbnailId:    rec.paper.thumbnailId ?? undefined,
      pdfId:          rec.paper.pdfId,
      createdAt:      rec.paper.createdAt,
      updatedAt:      rec.paper.updatedAt,
    }));
  }
}

