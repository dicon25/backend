import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { User } from '@scholub/database';
import { Request } from 'express';
import { ApiResponseType } from '@/common/lib/swagger/decorators';
import { PaperFacade } from '@/modules/paper/application/facades';
import { PaperEntity } from '@/modules/paper/domain/entities';
import { JwtAuthGuard } from '@/modules/user/infrastructure/guards';
import { Public } from '@/modules/user/presentation/decorators';
import {
  CategoryDto,
  ListPapersDto,
  PaperDetailDto,
  PaperListDto,
} from '../dtos';
import { RecordPaperViewResponseDto } from '../dtos/response/record-paper-view-response.dto';

@ApiTags('Papers')
@Controller('papers')
export class PaperController {
  constructor(private readonly paperFacade: PaperFacade) {
  }

  @Get('categories')
  @ApiOperation({
    summary:     'Get all categories with paper counts',
    description: '모든 논문 카테고리 목록을 각 카테고리별 논문 개수와 함께 조회합니다. 카테고리별 논문 통계 정보를 제공합니다.',
  })
  @ApiResponseType({
    type: CategoryDto, isArray: true,
  })
  @Public()
  async getCategories() {
    return await this.paperFacade.getCategories();
  }

  @Get('categories/:category')
  @ApiOperation({
    summary:     'Get papers by category',
    description: '특정 카테고리에 속한 논문 목록을 페이지네이션과 정렬 옵션을 사용하여 조회합니다. URL 파라미터로 카테고리를 지정하며, 쿼리 파라미터로 페이지 번호, 페이지당 항목 수, 정렬 기준 및 정렬 순서를 지정할 수 있습니다.',
  })
  @ApiResponseType({ type: PaperListDto })
  async listPapersByCategory(@Param('category') category: string, @Query() query: ListPapersDto) {
    return await this.paperFacade.listPapersByCategory(category, {
      page:      query.page ?? 1,
      limit:     query.limit ?? 20,
      sortBy:    query.sortBy,
      sortOrder: query.sortOrder,
    });
  }

  @Get('headlines')
  @Public()
  @ApiOperation({
    summary:     'Get headline papers',
    description: '헤드라인 논문 목록을 조회합니다. 최근 7일 내에 추가된 논문 중 인기도 점수((좋아요 수 * 2) + 조회수)가 높은 논문을 반환합니다. 기본값은 4개입니다.',
  })
  @ApiResponseType({
    type:    PaperDetailDto,
    isArray: true,
  })
  async getHeadlinePapers(@Query('limit') limit?: number) {
    const papers = await this.paperFacade.getHeadlinePapers(limit ?? 4);

    return papers.map(paper => this.mapToDto(paper));
  }

  @Get('popular')
  @Public()
  @ApiOperation({
    summary:     'Get popular papers',
    description: '인기 논문 목록을 조회합니다. 최근 90일 내에 추가된 논문 중 인기도 점수((좋아요 수 * 2) + 조회수)가 높은 논문을 반환합니다. 기본값은 20개입니다.',
  })
  @ApiResponseType({
    type:    PaperDetailDto,
    isArray: true,
  })
  async getPopularPapers(@Query('limit') limit?: number, @Query('days') days?: number) {
    const papers = await this.paperFacade.getPopularPapers(limit ?? 20, days ?? 90);

    return papers.map(paper => this.mapToDto(paper));
  }

  @Get('latest')
  @Public()
  @ApiOperation({
    summary:     'Get latest papers',
    description: '최신 연구 논문 목록을 조회합니다. 발행일(issuedAt) 기준으로 최신순으로 정렬하며, 발행일이 없는 경우 생성일(createdAt) 기준으로 정렬합니다. 기본값은 20개입니다.',
  })
  @ApiResponseType({
    type:    PaperDetailDto,
    isArray: true,
  })
  async getLatestPapers(@Query('limit') limit?: number) {
    const papers = await this.paperFacade.getLatestPapers(limit ?? 20);

    return papers.map(paper => this.mapToDto(paper));
  }

  private mapToDto(paper: PaperEntity): PaperDetailDto {
    return {
      id:             paper.id,
      paperId:        paper.paperId,
      title:          paper.title,
      categories:     paper.categories,
      authors:        paper.authors,
      summary:        paper.summary,
      content:        paper.content,
      doi:            paper.doi,
      url:            paper.url,
      pdfUrl:         paper.pdfUrl,
      issuedAt:       paper.issuedAt,
      likeCount:      paper.likeCount,
      unlikeCount:    paper.unlikeCount,
      totalViewCount: paper.totalViewCount,
      thumbnailId:    paper.thumbnailId,
      pdfId:          paper.pdfId,
      createdAt:      paper.createdAt,
      updatedAt:      paper.updatedAt,
    };
  }

  @Get('me/reacted')
  @ApiOperation({
    summary:     'Get my reacted papers',
    description: '현재 로그인한 사용자가 반응(좋아요/싫어요)을 누른 논문 목록을 조회합니다. 최근 반응한 순서로 정렬됩니다.',
  })
  @ApiResponseType({
    type:    PaperDetailDto,
    isArray: true,
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getMyReactedPapers(@Req() req: Request & {
    user: User;
  }) {
    const papers = await this.paperFacade.getMyReactedPapers(req.user.id);

    return papers.map(paper => this.mapToDto(paper));
  }

  @Get('me/discussed')
  @ApiOperation({
    summary:     'Get my discussed papers',
    description: '현재 로그인한 사용자가 토론에 참여한 논문 목록을 조회합니다. 최근 토론 참여 순서로 정렬됩니다.',
  })
  @ApiResponseType({
    type:    PaperDetailDto,
    isArray: true,
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getMyDiscussedPapers(@Req() req: Request & {
    user: User;
  }) {
    const papers = await this.paperFacade.getMyDiscussedPapers(req.user.id);

    return papers.map(paper => this.mapToDto(paper));
  }

  @Post(':paperId/view')
  @Public()
  @ApiOperation({
    summary:     'Record paper view',
    description: '사용자가 논문을 본 것으로 기록합니다. 클라이언트에서 논문 상세 페이지에 5분 이상 머무른 경우 호출합니다. 로그인한 사용자의 경우 사용자 ID가 함께 저장되며, 비로그인 사용자의 경우 논문 조회수만 증가합니다.',
  })
  @ApiResponseType({ type: RecordPaperViewResponseDto })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async recordPaperView(@Param('paperId') paperId: string, @Req() req: Request & {
    user?: User;
  }) {
    const userId = req.user?.id;

    return await this.paperFacade.recordPaperView(paperId, userId);
  }

  @Get(':paperId')
  @ApiOperation({
    summary:     'Get paper detail by paper ID',
    description: '논문 ID를 사용하여 특정 논문의 상세 정보를 조회합니다. 논문의 제목, 저자, 카테고리, 요약, 내용, DOI, 발행일, PDF URL 등의 정보를 포함합니다. 로그인한 사용자의 경우 해당 논문에 대한 반응(좋아요) 상태도 함께 반환됩니다.',
  })
  @ApiResponseType({ type: PaperDetailDto })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getPaperDetail(@Param('paperId') paperId: string, @Req() req: Request & {
    user?: User;
  }) {
    const userId = req.user?.id;

    return await this.paperFacade.getPaperDetail(paperId, userId);
  }
}

