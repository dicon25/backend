import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Prisma } from '@scholub/database';
import { PrismaService } from '@/common/modules/prisma';
import { GetMyDiscussedPapersQuery } from './get-my-discussed-papers.query';

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

@QueryHandler(GetMyDiscussedPapersQuery)
export class GetMyDiscussedPapersHandler implements IQueryHandler<GetMyDiscussedPapersQuery> {
  constructor(private readonly prisma: PrismaService) {
  }

  async execute(query: GetMyDiscussedPapersQuery): Promise<PaperResult[]> {
    // Get all discussion messages with paper IDs
    const allMessages = await this.prisma.discussionMessage.findMany({
      where:  { userId: query.userId },
      select: {
        discussionId: true,
        discussion:   { select: { paperId: true } },
        createdAt:    true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get distinct paper IDs with their latest message date
    const paperIdMap = new Map<string, Date>;

    for (const message of allMessages) {
      const paperId = message.discussion.paperId;
      const existing = paperIdMap.get(paperId);

      if (!existing || message.createdAt > existing) {
        paperIdMap.set(paperId, message.createdAt);
      }
    }

    // Sort by latest message date
    const sortedPaperIds = Array.from(paperIdMap.entries())
      .sort((a, b) => b[1].getTime() - a[1].getTime())
      .map(([paperId]) => paperId);

    const papers = await this.prisma.paper.findMany({ where: { id: { in: sortedPaperIds } } });

    // Map to result format and maintain order
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

