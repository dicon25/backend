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
      where:   { userId: query.userId },
      include: { paper: true },
    });

    // If recommendations exist, return them
    if (recommendations.length > 0) {
      // Sort by paper's issuedAt (or createdAt if issuedAt is null), then by recommendation createdAt
      const sortedRecommendations = recommendations.sort((a, b) => {
        const aDate = a.paper.issuedAt ?? a.paper.createdAt;
        const bDate = b.paper.issuedAt ?? b.paper.createdAt;

        return bDate.getTime() - aDate.getTime();
      });

      // Take limit
      const limitedRecommendations = sortedRecommendations.slice(0, query.limit);

      // Map to result format
      return limitedRecommendations.map(rec => this.mapPaperToResult(rec.paper));
    }

    // Fallback: Get papers matching user's interested categories
    const userPreference = await this.prisma.userPreference.findUnique({
      where:  { userId: query.userId },
      select: { interestedCategories: true },
    });

    const interestedCategories = userPreference?.interestedCategories ?? [];

    // If user has no interested categories, return latest papers
    if (interestedCategories.length === 0) {
      return this.getLatestPapers(query.limit);
    }

    // Find papers that have at least one category matching user's interested categories
    const papers = await this.prisma.paper.findMany({
      where:   { categories: { hasSome: interestedCategories } },
      take:    query.limit,
      orderBy: [
        { issuedAt: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    // If no papers match, return latest papers
    if (papers.length === 0) {
      return this.getLatestPapers(query.limit);
    }

    return papers.map(paper => this.mapPaperToResult(paper));
  }

  private async getLatestPapers(limit: number): Promise<PaperResult[]> {
    const papers = await this.prisma.paper.findMany({
      take:    limit,
      orderBy: [
        { issuedAt: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return papers.map(paper => this.mapPaperToResult(paper));
  }

  private mapPaperToResult(paper: {
    id:             string;
    paperId:        string;
    title:          string;
    categories:     string[];
    authors:        string[];
    summary:        string;
    content:        Prisma.JsonValue;
    doi:            string;
    url:            string | null;
    pdfUrl:         string | null;
    issuedAt:       Date | null;
    likeCount:      number;
    unlikeCount:    number;
    totalViewCount: number;
    thumbnailId:    string | null;
    pdfId:          string;
    createdAt:      Date;
    updatedAt:      Date;
  }): PaperResult {
    return {
      id:             paper.id,
      paperId:        paper.paperId,
      title:          paper.title,
      categories:     paper.categories,
      authors:        paper.authors,
      summary:        paper.summary,
      content:        paper.content,
      doi:            paper.doi,
      url:            paper.url ?? undefined,
      pdfUrl:         paper.pdfUrl ?? undefined,
      issuedAt:       paper.issuedAt ?? undefined,
      likeCount:      paper.likeCount,
      unlikeCount:    paper.unlikeCount,
      totalViewCount: paper.totalViewCount,
      thumbnailId:    paper.thumbnailId ?? undefined,
      pdfId:          paper.pdfId,
      createdAt:      paper.createdAt,
      updatedAt:      paper.updatedAt,
    };
  }
}

