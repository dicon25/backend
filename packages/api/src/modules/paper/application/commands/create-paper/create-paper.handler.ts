import { Logger } from '@nestjs/common';
import { ConflictException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '@/common/modules/prisma';
import { PaperEntity } from '../../../domain/entities';
import { PaperRepositoryPort } from '../../../domain/repositories';
import { PaperSyncService } from '../../../infrastructure/search/meilisearch';
import { CreatePaperCommand } from './create-paper.command';

@CommandHandler(CreatePaperCommand)
export class CreatePaperHandler implements ICommandHandler<CreatePaperCommand> {
  private readonly logger = new Logger(CreatePaperHandler.name);

  constructor(private readonly paperRepository: PaperRepositoryPort,
    private readonly prisma: PrismaService,
    private readonly paperSyncService: PaperSyncService) {
  }

  async execute(command: CreatePaperCommand): Promise<PaperEntity> {
    const checkStart = Date.now();

    // Check if paper with same DOI or paperId already exists (in parallel)
    const [existingByDoi, existingByPaperId] = await Promise.all([
      this.paperRepository.findByDoi(command.doi),
      this.paperRepository.findByPaperId(command.paperId),
    ]);

    this.logger.log(`[CreatePaperHandler] Duplicate check completed in ${Date.now() - checkStart}ms`);

    if (existingByDoi) {
      throw new ConflictException('Paper with this DOI already exists');
    }

    if (existingByPaperId) {
      throw new ConflictException('Paper with this Paper ID already exists');
    }

    const createStart = Date.now();

    const result = await this.paperRepository.create({
      paperId:        command.paperId,
      title:          command.title,
      categories:     command.categories,
      authors:        command.authors,
      summary:          command.summary,
      translatedSummary: command.translatedSummary,
      content:          command.content,
      hashtags:       command.hashtags ?? [],
      doi:            command.doi,
      pdfId:          command.pdfId,
      url:            command.url,
      pdfUrl:         command.pdfUrl,
      issuedAt:       command.issuedAt,
      thumbnailId:    command.thumbnailId,
      likeCount:      0,
      unlikeCount:    0,
      totalViewCount: 0,
    } as Partial<PaperEntity>);

    this.logger.log(`[CreatePaperHandler] Paper creation completed in ${Date.now() - createStart}ms`);

    // Add to user recommendations if interestedUserIds provided
    if (command.interestedUserIds && command.interestedUserIds.length > 0) {
      const recommendationStart = Date.now();

      await this.prisma.userRecommendation.createMany({
        data: command.interestedUserIds.map(userId => ({
          userId,
          paperId: result.id,
        })),
        skipDuplicates: true,
      });

      this.logger.log(`[CreatePaperHandler] User recommendations created in ${Date.now() - recommendationStart}ms`);

      // Update user hashtags if paper hashtags provided
      if (command.hashtags && command.hashtags.length > 0) {
        const hashtagUpdateStart = Date.now();

        await Promise.all(command.interestedUserIds.map(async userId => {
          const user = await this.prisma.user.findUnique({
            where:  { id: userId },
            select: { hashtags: true },
          });

          if (user) {
            const previousUserHashtags = user.hashtags ?? [];
            const updatedHashtags = Array.from(new Set([...previousUserHashtags, ...command.hashtags ?? []]));

            await this.prisma.user.update({
              where: { id: userId },
              data:  { hashtags: updatedHashtags },
            });
          }
        }));

        this.logger.log(`[CreatePaperHandler] User hashtags updated in ${Date.now() - hashtagUpdateStart}ms`);
      }
    }

    // Index paper in MeiliSearch
    try {
      await this.paperSyncService.indexPaper(result);
    } catch (error) {
      this.logger.warn(`Failed to index paper in MeiliSearch: ${result.id}`, error);

      // Don't throw - allow the operation to continue even if indexing fails
    }

    return result;
  }
}

