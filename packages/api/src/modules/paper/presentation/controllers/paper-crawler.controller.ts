import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Logger,
  Param,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
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
import { Public } from '@/modules/user/presentation/decorators';
import { CreatePaperDto, PaperDetailDto } from '../dtos';

@ApiTags('Crawler - Papers')
@ApiSecurity('bearer')
@Controller('crawler/papers')
@Public()
@UseGuards(CrawlerAuthGuard)
export class PaperCrawlerController {
  private readonly logger = new Logger(PaperCrawlerController.name);

  constructor(private readonly paperFacade: PaperFacade,
    private readonly assetFacade: AssetFacade,
    private readonly prisma: PrismaService) {
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

    const command = new CreatePaperCommand(
      dto.paperId,
      dto.title,
      dto.categories,
      dto.authors,
      dto.summary,
      dto.content,
      dto.doi,
      pdfId,
      dto.url,
      dto.pdfUrl,
      dto.issuedAt ? new Date(dto.issuedAt) : undefined,
      thumbnailId,
      dto.hashtags,
      dto.interestedUserIds,
    );

    const createStart = Date.now();
    const result = await this.paperFacade.createPaper(command);

    this.logger.log(`[createPaper] Paper creation completed in ${Date.now() - createStart}ms`);

    this.logger.log(`[createPaper] Total time: ${Date.now() - startTime}ms`);

    return result;
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
}

