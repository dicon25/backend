import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  NotFoundException,
  Param,
  Patch,
  Post,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { CrawlerAuthGuard } from '@/common/guards';
import { ApiResponseType } from '@/common/lib/swagger/decorators';
import { PrismaService } from '@/common/modules/prisma';
import { getMulterS3Uploader } from '@/common/modules/s3/s3.config';
import { AssetFacade } from '@/modules/asset/application/facades';
import { CreatePaperCommand } from '@/modules/paper/application/commands';
import { PaperFacade } from '@/modules/paper/application/facades';
import { PaperRepositoryPort } from '@/modules/paper/domain/repositories';
import { PaperIndexService, PaperSyncService } from '@/modules/paper/infrastructure/search/meilisearch';
import { Public } from '@/modules/user/presentation/decorators';
import { CreatePaperDto, PaperDetailDto, UpdateThumbnailDto } from '../dtos';

@ApiTags('Crawler - Papers')
@ApiSecurity('bearer')
@Controller('crawler/papers')
@Public()
@UseGuards(CrawlerAuthGuard)
export class PaperCrawlerController {
  private readonly logger = new Logger(PaperCrawlerController.name);

  constructor(
    private readonly paperFacade: PaperFacade,
    private readonly assetFacade: AssetFacade,
    private readonly prisma: PrismaService,
    private readonly paperSyncService: PaperSyncService,
    private readonly paperIndexService: PaperIndexService,
    private readonly paperRepository: PaperRepositoryPort,
  ) {
  }

  @Post()
  @UseInterceptors(FileFieldsInterceptor([
    {
      name: 'pdf', maxCount: 1,
    },
    {
      name: 'thumbnail', maxCount: 1,
    },
  ], getMulterS3Uploader({
    extensions: [
      '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp',
    ],
    maxSize: 100 * 1024 * 1024, // 100MB
  })))
  @ApiOperation({
    summary:     'Create a new paper (crawler only)',
    description: '크롤러 전용 엔드포인트로, 새로운 논문을 생성합니다. 논문 ID, 제목, 카테고리, 저자, 요약, 내용, DOI는 필수이며, PDF 파일과 썸네일 이미지를 업로드하거나 기존 에셋 ID를 제공할 수 있습니다. PDF는 최대 100MB까지 업로드 가능하며, PDF와 썸네일은 병렬로 업로드됩니다. 크롤러 인증이 필요합니다.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: {
    type:       'object',
    properties: {
      paperId:    { type: 'string' },
      title:      { type: 'string' },
      categories: {
        type: 'array', items: { type: 'string' },
      },
      authors: {
        type: 'array', items: { type: 'string' },
      },
      summary: { type: 'string' },
      content: { type: 'object' },
      doi:     { type: 'string' },
      pdfId:   {
        type: 'string', description: 'Optional: existing PDF asset ID',
      },
      pdf: {
        type:        'string',
        format:      'binary',
        description: 'PDF file (optional if pdfId is provided)',
      },
      thumbnailId: {
        type: 'string', description: 'Optional: existing thumbnail asset ID',
      },
      thumbnail: {
        type:        'string',
        format:      'binary',
        description: 'Thumbnail image file (optional if thumbnailId is provided)',
      },
      url:      { type: 'string' },
      pdfUrl:   { type: 'string' },
      issuedAt: {
        type: 'string', format: 'date-time',
      },
      hashtags: {
        type:        'array',
        items:       { type: 'string' },
        description: 'Hashtags (not exposed in API responses)',
      },
      interestedUserIds: {
        type:        'array',
        items:       { type: 'string' },
        description: 'User IDs who should receive this paper as recommendation',
      },
    },
    required: [
      'paperId', 'title', 'categories', 'authors', 'summary', 'content', 'doi',
    ],
  } })
  @ApiResponseType({ type: PaperDetailDto })
  async createPaper(@Body() dto: CreatePaperDto,
    @UploadedFiles() files?: {
      pdf?:       Express.Multer.File[];
      thumbnail?: Express.Multer.File[];
    }) {
    const startTime = Date.now();

    this.logger.log(`[createPaper] Starting - paperId: ${dto.paperId}`);

    let pdfId = dto.pdfId;
    let thumbnailId = dto.thumbnailId;

    // Validate existing asset IDs if provided
    if (pdfId && (!files?.pdf || files.pdf.length === 0)) {
      const checkStart = Date.now();
      const existsResult = await this.assetFacade.checkAssetExists(pdfId);

      this.logger.log(`[createPaper] PDF asset check completed in ${Date.now() - checkStart}ms`);

      if (!existsResult.exists) {
        throw new BadRequestException(`PDF asset with id '${pdfId}' does not exist`);
      }
    }

    if (thumbnailId && (!files?.thumbnail || files.thumbnail.length === 0)) {
      const checkStart = Date.now();
      const existsResult = await this.assetFacade.checkAssetExists(thumbnailId);

      this.logger.log(`[createPaper] Thumbnail asset check completed in ${Date.now() - checkStart}ms`);

      if (!existsResult.exists) {
        throw new BadRequestException(`Thumbnail asset with id '${thumbnailId}' does not exist`);
      }
    }

    // Upload files in parallel if both are provided
    const uploadPromises: Promise<void>[] = [];

    if (files?.pdf && files.pdf.length > 0 && !pdfId) {
      const pdfUploadStart = Date.now();
      const pdfFile = files.pdf[0];

      uploadPromises.push(this.assetFacade.uploadAsset(pdfFile, 'paper-pdf')
        .then(result => {
          pdfId = result.id;

          this.logger.log(`[createPaper] PDF upload completed in ${Date.now() - pdfUploadStart}ms - size: ${pdfFile.size} bytes`);
        })
        .catch(err => {
          this.logger.error(`[createPaper] PDF upload failed: ${err.message}`, err.stack);

          throw err;
        }));
    }

    if (files?.thumbnail && files.thumbnail.length > 0 && !thumbnailId) {
      const thumbnailUploadStart = Date.now();
      const thumbnailFile = files.thumbnail[0];

      uploadPromises.push(this.assetFacade.uploadAsset(thumbnailFile, 'thumbnails')
        .then(result => {
          thumbnailId = result.id;

          this.logger.log(`[createPaper] Thumbnail upload completed in ${Date.now() - thumbnailUploadStart}ms - size: ${thumbnailFile.size} bytes`);
        })
        .catch(err => {
          this.logger.error(`[createPaper] Thumbnail upload failed: ${err.message}`, err.stack);

          throw err;
        }));
    }

    if (uploadPromises.length > 0) {
      const uploadStart = Date.now();

      await Promise.all(uploadPromises);

      this.logger.log(`[createPaper] All file uploads completed in ${Date.now() - uploadStart}ms`);
    }

    if (!pdfId) {
      throw new BadRequestException('Either pdfId or pdf file must be provided');
    }

    const command = CreatePaperCommand.from({
      paperId:           dto.paperId,
      title:             dto.title,
      categories:        dto.categories,
      authors:           dto.authors,
      summary:           dto.summary,
      translatedSummary: dto.translatedSummary,
      content:           dto.content,
      doi:               dto.doi,
      pdfId:             pdfId,
      url:               dto.url,
      pdfUrl:            dto.pdfUrl,
      issuedAt:          dto.issuedAt ? new Date(dto.issuedAt) : undefined,
      thumbnailId:       thumbnailId,
      hashtags:          dto.hashtags,
      interestedUserIds: dto.interestedUserIds,
    });

    const createStart = Date.now();
    const result = await this.paperFacade.createPaper(command);

    this.logger.log(`[createPaper] Paper creation completed in ${Date.now() - createStart}ms`);

    this.logger.log(`[createPaper] Total time: ${Date.now() - startTime}ms`);

    return result;
  }

  @Get()
  @ApiOperation({
    summary:     'Get all papers (crawler only)',
    description: '크롤러 전용 엔드포인트로, 페이지네이션 없이 모든 논문을 조회합니다. 각 논문의 상세 정보와 PDF URL, 썸네일 URL을 포함합니다. 크롤러 인증이 필요합니다.',
  })
  @ApiResponseType({
    type: PaperDetailDto, isArray: true,
  })
  async getAllPapers() {
    const startTime = Date.now();

    this.logger.log('[getAllPapers] Starting to fetch all papers');

    // Get all papers from database
    const papers = await this.prisma.paper.findMany({ orderBy: { createdAt: 'desc' } });

    this.logger.log(`[getAllPapers] Found ${papers.length} papers`);

    // Collect all asset IDs (thumbnails and PDFs)
    const thumbnailIds = papers
      .map(p => p.thumbnailId)
      .filter((id): id is string => id !== undefined);

    const pdfIds = papers
      .map(p => p.pdfId)
      .filter((id): id is string => id !== undefined);

    // Batch fetch all assets
    const thumbnailMap = new Map<string, string>;
    const pdfMap = new Map<string, string>;

    if (thumbnailIds.length > 0) {
      await Promise.all(thumbnailIds.map(async id => {
        try {
          const asset = await this.assetFacade.getAssetDetail(id);

          thumbnailMap.set(id, asset.url);
        } catch {
          // Asset not found, skip
        }
      }));
    }

    if (pdfIds.length > 0) {
      await Promise.all(pdfIds.map(async id => {
        try {
          const asset = await this.assetFacade.getAssetDetail(id);

          pdfMap.set(id, asset.url);
        } catch {
          // Asset not found, skip
        }
      }));
    }

    // Map papers to DTOs
    const result = papers.map(paper => {
      const thumbnailUrl = paper.thumbnailId
        ? thumbnailMap.get(paper.thumbnailId) ?? undefined
        : undefined;

      const pdfUrl = paper.pdfId
        ? pdfMap.get(paper.pdfId) ?? paper.pdfUrl ?? undefined
        : paper.pdfUrl ?? undefined;

      return {
        id:                paper.id,
        paperId:           paper.paperId,
        title:             paper.title,
        categories:        paper.categories,
        authors:           paper.authors,
        summary:           paper.summary,
        translatedSummary: paper.translatedSummary ?? undefined,
        content:           paper.content,
        doi:               paper.doi,
        url:               paper.url ?? undefined,
        pdfUrl,
        issuedAt:          paper.issuedAt ?? undefined,
        likeCount:         paper.likeCount,
        unlikeCount:       paper.unlikeCount,
        totalViewCount:    paper.totalViewCount,
        thumbnailUrl,
        pdfId:             paper.pdfId,
        createdAt:         paper.createdAt,
        updatedAt:         paper.updatedAt,
      };
    });

    this.logger.log(`[getAllPapers] Total time: ${Date.now() - startTime}ms`);

    return result;
  }

  @Patch(':paperId/thumbnail')
  @UseInterceptors(FileInterceptor('thumbnail', getMulterS3Uploader({
    extensions: [
      '.jpg', '.jpeg', '.png', '.gif', '.webp',
    ],
    maxSize: 10 * 1024 * 1024, // 10MB
  })))
  @ApiOperation({
    summary:     'Update paper thumbnail (crawler only)',
    description: '크롤러 전용 엔드포인트로, 논문의 썸네일을 변경합니다. 썸네일 파일을 업로드하거나 기존 에셋 ID를 제공할 수 있습니다. 크롤러 인증이 필요합니다.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: {
    type:       'object',
    properties: {
      thumbnailId: {
        type: 'string', description: 'Optional: existing thumbnail asset ID',
      },
      thumbnail: {
        type:        'string',
        format:      'binary',
        description: 'Thumbnail image file (optional if thumbnailId is provided)',
      },
    },
  } })
  @ApiResponseType({ type: PaperDetailDto })
  async updateThumbnail(@Param('paperId') paperId: string,
    @Body() dto: UpdateThumbnailDto,
    @UploadedFile() thumbnailFile?: Express.Multer.File) {
    const startTime = Date.now();

    this.logger.log(`[updateThumbnail] Starting - paperId: ${paperId}`);

    // Find paper by id (PK)
    const paper = await this.prisma.paper.findUnique({ where: { id: paperId } });

    if (!paper) {
      throw new NotFoundException(`Paper with id '${paperId}' not found`);
    }

    let thumbnailId = dto.thumbnailId;

    const oldThumbnailId = paper.thumbnailId;

    // Validate existing asset ID if provided
    if (thumbnailId && !thumbnailFile) {
      const checkStart = Date.now();
      const existsResult = await this.assetFacade.checkAssetExists(thumbnailId);

      this.logger.log(`[updateThumbnail] Thumbnail asset check completed in ${Date.now() - checkStart}ms`);

      if (!existsResult.exists) {
        throw new BadRequestException(`Thumbnail asset with id '${thumbnailId}' does not exist`);
      }
    }

    // Upload new thumbnail file if provided
    if (thumbnailFile && !thumbnailId) {
      const thumbnailUploadStart = Date.now();

      try {
        const uploadResult = await this.assetFacade.uploadAsset(thumbnailFile, 'thumbnails');

        thumbnailId = uploadResult.id;

        this.logger.log(`[updateThumbnail] Thumbnail upload completed in ${Date.now() - thumbnailUploadStart}ms - size: ${thumbnailFile.size} bytes`);
      } catch (err: unknown) {
        const error = err as Error;

        this.logger.error(`[updateThumbnail] Thumbnail upload failed: ${error.message}`, error.stack);

        throw err;
      }
    }

    if (!thumbnailId) {
      throw new BadRequestException('Either thumbnailId or thumbnail file must be provided');
    }

    // Update paper thumbnail
    const updateStart = Date.now();

    await this.paperRepository.update(paperId, { thumbnailId });

    this.logger.log(`[updateThumbnail] Paper update completed in ${Date.now() - updateStart}ms`);

    // Delete old thumbnail asset if it exists and is different from the new one
    if (oldThumbnailId && oldThumbnailId !== thumbnailId) {
      try {
        await this.assetFacade.deleteAsset(oldThumbnailId);

        this.logger.log(`[updateThumbnail] Old thumbnail asset deleted: ${oldThumbnailId}`);
      } catch (error) {
        this.logger.warn(`[updateThumbnail] Failed to delete old thumbnail asset ${oldThumbnailId}`, error);

        // Don't throw - allow the operation to continue even if deletion fails
      }
    }

    this.logger.log(`[updateThumbnail] Total time: ${Date.now() - startTime}ms`);

    // Get updated paper detail
    const paperDetail = await this.paperFacade.getPaperDetail(paperId);

    return paperDetail;
  }

  @Delete(':paperId')
  @ApiOperation({
    summary:     'Delete a paper (crawler only)',
    description: '크롤러 전용 엔드포인트로, 논문 ID를 사용하여 논문을 삭제합니다. 논문과 관련된 모든 데이터가 함께 삭제됩니다. 크롤러 인증이 필요합니다.',
  })
  async deletePaper(@Param('paperId') paperId: string) {
    await this.paperFacade.deletePaper(paperId);

    return { message: 'Paper deleted successfully' };
  }

  @Delete()
  @ApiOperation({
    summary:     'Delete all papers (crawler only)',
    description: '크롤러 전용 엔드포인트로, 모든 논문을 삭제합니다. 논문과 관련된 S3 파일, Asset 테이블, Paper 테이블, MeiliSearch 인덱스의 모든 데이터가 삭제됩니다. 크롤러 인증이 필요합니다.',
  })
  async deleteAllPapers() {
    const startTime = Date.now();

    this.logger.log('[deleteAllPapers] Starting deletion of all papers');

    // 1. Get all papers with their asset IDs
    const papers = await this.prisma.paper.findMany({ select: {
      id:          true,
      pdfId:       true,
      thumbnailId: true,
    } });

    this.logger.log(`[deleteAllPapers] Found ${papers.length} papers to delete`);

    // 2. Collect all unique asset IDs
    const assetIds = new Set<string>;

    papers.forEach(paper => {
      if (paper.pdfId) {
        assetIds.add(paper.pdfId);
      }

      if (paper.thumbnailId) {
        assetIds.add(paper.thumbnailId);
      }
    });

    this.logger.log(`[deleteAllPapers] Found ${assetIds.size} unique assets to delete`);

    // 3. Delete all papers from database first (to release foreign key constraints)
    const paperDeletionStart = Date.now();
    const deletedPapersCount = await this.prisma.paper.deleteMany({});

    this.logger.log(`[deleteAllPapers] Paper deletion completed in ${Date.now() - paperDeletionStart}ms - deleted: ${deletedPapersCount.count} papers`);

    const assetDeletionStart = Date.now();

    let deletedAssetCount = 0;
    let failedAssetCount = 0;

    await Promise.all(Array.from(assetIds).map(async assetId => {
      try {
        await this.assetFacade.deleteAsset(assetId);

        deletedAssetCount++;
      } catch (error) {
        this.logger.warn(`[deleteAllPapers] Failed to delete asset ${assetId}`, error);

        failedAssetCount++;
      }
    }));

    this.logger.log(`[deleteAllPapers] Asset deletion completed in ${Date.now() - assetDeletionStart}ms - deleted: ${deletedAssetCount}, failed: ${failedAssetCount}`);

    // 5. Delete MeiliSearch index
    try {
      await this.paperIndexService.deleteIndex();

      this.logger.log('[deleteAllPapers] MeiliSearch index deleted');
    } catch (error) {
      this.logger.warn('[deleteAllPapers] Failed to delete MeiliSearch index', error);
    }

    this.logger.log(`[deleteAllPapers] Total time: ${Date.now() - startTime}ms`);

    return {
      message:       'All papers deleted successfully',
      deletedPapers: deletedPapersCount.count,
      deletedAssets: deletedAssetCount,
      failedAssets:  failedAssetCount,
      totalTimeMs:   Date.now() - startTime,
    };
  }
}

