import {
  BadRequestException,
  Body,
  Controller,
  Delete,
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
  constructor(private readonly paperFacade: PaperFacade,
    private readonly assetFacade: AssetFacade) {
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
  @ApiOperation({ summary: 'Create a new paper (crawler only)' })
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
    },
    required: [
      'paperId', 'title', 'categories', 'authors', 'summary', 'content', 'doi',
    ],
  } })
  @ApiResponseType({ type: PaperDetailDto })
  async createPaper(@Body() dto: CreatePaperDto,
    @UploadedFiles() files?: {
      pdf?: Express.Multer.File[]; thumbnail?: Express.Multer.File[];
    }) {
    let pdfId = dto.pdfId;
    let thumbnailId = dto.thumbnailId;

    // Upload PDF file if provided
    if (files?.pdf && files.pdf.length > 0 && !pdfId) {
      const assetResult = await this.assetFacade.uploadAsset(files.pdf[0], 'papers');

      pdfId = assetResult.id;
    }

    if (!pdfId) {
      throw new BadRequestException('Either pdfId or pdf file must be provided');
    }

    // Upload thumbnail file if provided
    if (files?.thumbnail && files.thumbnail.length > 0 && !thumbnailId) {
      const assetResult = await this.assetFacade.uploadAsset(files.thumbnail[0], 'thumbnails');

      thumbnailId = assetResult.id;
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
    );

    return await this.paperFacade.createPaper(command);
  }

  @Delete(':paperId')
  @ApiOperation({ summary: 'Delete a paper (crawler only)' })
  async deletePaper(@Param('paperId') paperId: string) {
    await this.paperFacade.deletePaper(paperId);

    return { message: 'Paper deleted successfully' };
  }
}

