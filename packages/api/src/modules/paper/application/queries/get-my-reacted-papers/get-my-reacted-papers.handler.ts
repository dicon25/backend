import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Prisma } from '@scholub/database';
import { PrismaService } from '@/common/modules/prisma';
import { GetMyReactedPapersQuery } from './get-my-reacted-papers.query';

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

@QueryHandler(GetMyReactedPapersQuery)
export class GetMyReactedPapersHandler implements IQueryHandler<GetMyReactedPapersQuery> {
  constructor(private readonly prisma: PrismaService) {
  }

  async execute(query: GetMyReactedPapersQuery): Promise<PaperResult[]> {
    const allReactions = await this.prisma.reaction.findMany({
      where:  { userId: query.userId },
      select: {
        paperId:   true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const paperIdMap = new Map<string, Date>;

    for (const reaction of allReactions) {
      const existing = paperIdMap.get(reaction.paperId);

      if (!existing || reaction.createdAt > existing) {
        paperIdMap.set(reaction.paperId, reaction.createdAt);
      }
    }

    const sortedPaperIds = Array.from(paperIdMap.entries())
      .sort((a, b) => b[1].getTime() - a[1].getTime())
      .map(([paperId]) => paperId);

    const papers = await this.prisma.paper.findMany({ where: { id: { in: sortedPaperIds } } });

    const paperMap = new Map(papers.map(p => [
      p.id,
      {
        id:             p.id,
        paperId:        p.paperId,
        title:          p.title,
        categories:     p.categories,
        authors:        p.authors,
        summary:        p.summary,
        content:        p.content,
        doi:            p.doi,
        url:            p.url ?? undefined,
        pdfUrl:         p.pdfUrl ?? undefined,
        issuedAt:       p.issuedAt ?? undefined,
        likeCount:      p.likeCount,
        unlikeCount:    p.unlikeCount,
        totalViewCount: p.totalViewCount,
        thumbnailId:    p.thumbnailId ?? undefined,
        pdfId:          p.pdfId,
        createdAt:      p.createdAt,
        updatedAt:      p.updatedAt,
      },
    ]));

    return sortedPaperIds
      .map(id => paperMap.get(id))
      .filter((p): p is NonNullable<typeof p> => p !== undefined);
  }
}

