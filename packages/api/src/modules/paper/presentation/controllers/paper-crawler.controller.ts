import { Controller, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity } from '@nestjs/swagger';
import { PaperFacade } from '../../application/facades';
import { CreatePaperDto, PaperDetailDto } from '../dtos';
import { CreatePaperCommand } from '../../application/commands';
import { CrawlerAuthGuard } from '@/common/guards';
import { ApiResponseType } from '@/common/lib/swagger/decorators';

@ApiTags('Crawler - Papers')
@ApiSecurity('X-Secret-Key')
@Controller('crawler/papers')
@UseGuards(CrawlerAuthGuard)
export class PaperCrawlerController {
  constructor(private readonly paperFacade: PaperFacade) {}

  @Post()
  @ApiOperation({ summary: 'Create a new paper (crawler only)' })
  @ApiResponseType({ type: PaperDetailDto })
  async createPaper(@Body() dto: CreatePaperDto) {
    const command = new CreatePaperCommand(
      dto.paperId,
      dto.title,
      dto.categories,
      dto.authors,
      dto.summary,
      dto.content,
      dto.doi,
      dto.pdfId,
      dto.url,
      dto.pdfUrl,
      dto.issuedAt ? new Date(dto.issuedAt) : undefined,
      dto.thumbnailId,
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



