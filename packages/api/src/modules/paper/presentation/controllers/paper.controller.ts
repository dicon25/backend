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
import { PrismaService } from '@/common/modules/prisma';
import { AssetFacade } from '@/modules/asset/application/facades';
import { PaperFacade } from '@/modules/paper/application/facades';
import { PaperEntity } from '@/modules/paper/domain/entities';
import { PaperSortBy, SortOrder } from '@/modules/paper/domain/enums';
import { JwtAuthGuard } from '@/modules/user/infrastructure/guards';
import { Public } from '@/modules/user/presentation/decorators';
import {
  CategoryDto,
  ListPapersDto,
  PaperDetailDto,
  PaperListDto,
  PaperListItemDto,
  SearchPapersDto,
} from '../dtos';
import { RecordPaperViewResponseDto } from '../dtos/response/record-paper-view-response.dto';

@ApiTags('Papers')
@Controller('papers')
export class PaperController {
  constructor(private readonly paperFacade: PaperFacade,
    private readonly assetFacade: AssetFacade,
    private readonly prisma: PrismaService) {
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

  @Get('search')
  @ApiOperation({
    summary:     'Search papers',
    description: 'MeiliSearch를 사용하여 논문을 검색합니다. 제목, 요약, 저자, 카테고리에서 검색어를 찾습니다. 검색어가 제공되지 않으면 모든 논문을 반환합니다.',
  })
  @ApiResponseType({ type: PaperListDto })
  @Public()
  async searchPapers(@Query() dto: SearchPapersDto, @Req() req: Request & {
    user?: User;
  }) {
    const result = await this.paperFacade.listPapers({
      page:      1,
      limit:     20,
      sortBy:    PaperSortBy.CREATED_AT,
      sortOrder: SortOrder.DESC,
      filters:   { searchQuery: dto.query },
    });

    const papers = await this.mapPapersToListItemDto(result.papers, req.user?.id);

    return {
      papers,
      total:      result.total,
      page:       result.page,
      limit:      result.limit,
      totalPages: result.totalPages,
    };
  }

  @Get('categories/:category')
  @ApiOperation({
    summary:     'Get papers by category',
    description: '특정 카테고리에 속한 논문 목록을 페이지네이션과 정렬 옵션을 사용하여 조회합니다. URL 파라미터로 카테고리를 지정하며, 쿼리 파라미터로 페이지 번호, 페이지당 항목 수, 정렬 기준 및 정렬 순서를 지정할 수 있습니다.',
  })
  @ApiResponseType({ type: PaperListDto })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async listPapersByCategory(@Param('category') category: string, @Query() query: ListPapersDto, @Req() req: Request & {
    user: User;
  }) {
    const result = await this.paperFacade.listPapersByCategory(category, {
      page:      query.page ?? 1,
      limit:     query.limit ?? 20,
      sortBy:    query.sortBy,
      sortOrder: query.sortOrder,
    });

    const papers = await this.mapPapersToListItemDto(result.papers, req.user.id);

    return {
      papers,
      total:      result.total,
      page:       result.page,
      limit:      result.limit,
      totalPages: result.totalPages,
    };
  }

  @Get('headlines')
  @ApiOperation({
    summary:     'Get headline papers',
    description: '헤드라인 논문 목록을 조회합니다. 최근 7일 내에 추가된 논문 중 인기도 점수((좋아요 수 * 2) + 조회수)가 높은 논문을 반환합니다. 기본값은 4개입니다.',
  })
  @ApiResponseType({
    type:    PaperListItemDto,
    isArray: true,
  })
  @Public()
  async getHeadlinePapers(@Req() req: Request & {
    user?: User;
  }, @Query('limit') limit?: number) {
    const papers = await this.paperFacade.getHeadlinePapers(limit ?? 4);

    return await this.mapPapersToListItemDto(papers, req.user?.id);
  }

  @Get('popular')
  @ApiOperation({
    summary:     'Get popular papers',
    description: '인기 논문 목록을 조회합니다. 최근 90일 내에 추가된 논문 중 인기도 점수((좋아요 수 * 2) + 조회수)가 높은 논문을 반환합니다. 기본값은 20개입니다.',
  })
  @ApiResponseType({
    type:    PaperListItemDto,
    isArray: true,
  })
  @Public()
  async getPopularPapers(@Req() req: Request & {
    user?: User;
  }, @Query('limit') limit?: number, @Query('days') days?: number) {
    const papers = await this.paperFacade.getPopularPapers(limit ?? 20, days ?? 90);

    return await this.mapPapersToListItemDto(papers, req.user?.id);
  }

  @Get('latest')
  @ApiOperation({
    summary:     'Get latest papers',
    description: '최신 연구 논문 목록을 조회합니다. 발행일(issuedAt) 기준으로 최신순으로 정렬하며, 발행일이 없는 경우 생성일(createdAt) 기준으로 정렬합니다. 기본값은 20개입니다.',
  })
  @ApiResponseType({
    type:    PaperListItemDto,
    isArray: true,
  })
  @Public()
  async getLatestPapers(@Req() req: Request & {
    user?: User;
  }, @Query('limit') limit?: number) {
    const papers = await this.paperFacade.getLatestPapers(limit ?? 20);

    return await this.mapPapersToListItemDto(papers, req.user?.id);
  }

  private async mapPapersToDto(papers: PaperEntity[]): Promise<PaperDetailDto[]> {
    // Collect all thumbnail IDs
    const thumbnailIds = papers
      .map(p => p.thumbnailId)
      .filter((id): id is string => id !== undefined);

    // Batch fetch all thumbnail assets
    const thumbnailMap = new Map<string, string>;

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

    // Map papers to DTOs
    return papers.map(paper => this.mapToDto(paper, thumbnailMap));
  }

  private mapToDto(paper: PaperEntity, thumbnailMap?: Map<string, string>): PaperDetailDto {
    const thumbnailUrl = paper.thumbnailId && thumbnailMap
      ? thumbnailMap.get(paper.thumbnailId) ?? undefined
      : undefined;

    return {
      id:                paper.id,
      paperId:           paper.paperId,
      title:             paper.title,
      categories:        paper.categories,
      authors:           paper.authors,
      summary:           paper.summary,
      translatedSummary: paper.translatedSummary,
      content:           paper.content,
      doi:               paper.doi,
      url:               paper.url,
      pdfUrl:            paper.pdfUrl,
      issuedAt:          paper.issuedAt,
      likeCount:         paper.likeCount,
      unlikeCount:       paper.unlikeCount,
      totalViewCount:    paper.totalViewCount,
      thumbnailUrl,
      pdfId:             paper.pdfId,
      createdAt:         paper.createdAt,
      updatedAt:         paper.updatedAt,
    };
  }

  private async mapPapersToListItemDto(papers: PaperEntity[], userId?: string): Promise<PaperListItemDto[]> {
    if (papers.length === 0) {
      return [];
    }

    const thumbnailIds = papers
      .map(p => p.thumbnailId)
      .filter((id): id is string => id !== undefined);

    const paperIds = papers.map(p => p.id);
    const thumbnailMap = new Map<string, string>;

    if (thumbnailIds.length > 0) {
      await Promise.all(thumbnailIds.map(async id => {
        try {
          const asset = await this.assetFacade.getAssetDetail(id);

          thumbnailMap.set(id, asset.url);
        } catch {
        }
      }));
    }

    // Batch fetch discussion counts
    const discussionCounts = await this.prisma.discussion.groupBy({
      by:     ['paperId'],
      where:  { paperId: { in: paperIds } },
      _count: { paperId: true },
    });

    const discussionCountMap = new Map<string, number>;

    discussionCounts.forEach(item => {
      discussionCountMap.set(item.paperId, item._count.paperId);
    });

    // Batch fetch user reactions if userId is provided
    const reactionMap = new Map<string, {
      isLiked:   boolean;
      isUnliked: boolean;
    }>;

    if (userId) {
      const reactions = await this.prisma.reaction.findMany({ where: {
        userId,
        paperId: { in: paperIds },
      } });

      reactions.forEach(reaction => {
        const existing = reactionMap.get(reaction.paperId) ?? {
          isLiked:   false,
          isUnliked: false,
        };

        if (reaction.type === 'LIKE') {
          existing.isLiked = true;
        } else if (reaction.type === 'UNLIKE') {
          existing.isUnliked = true;
        }

        reactionMap.set(reaction.paperId, existing);
      });
    }

    // Map papers to list item DTOs
    return papers.map(paper => {
      const thumbnailUrl = paper.thumbnailId && thumbnailMap
        ? thumbnailMap.get(paper.thumbnailId) ?? undefined
        : undefined;

      const myReaction = userId
        ? reactionMap.get(paper.id) ?? {
          isLiked:   false,
          isUnliked: false,
        }
        : {
          isLiked:   false,
          isUnliked: false,
        };

      return {
        id:                paper.id,
        paperId:           paper.paperId,
        categories:        paper.categories,
        title:             paper.title,
        summary:           paper.summary,
        translatedSummary: paper.translatedSummary,
        likeCount:         paper.likeCount,
        unlikeCount:       paper.unlikeCount,
        discussionCount:   discussionCountMap.get(paper.id) ?? 0,
        thumbnailUrl,
        myReaction,
      };
    });
  }

  @Get('me/reacted')
  @ApiOperation({
    summary:     'Get my reacted papers',
    description: '현재 로그인한 사용자가 반응(좋아요/싫어요)을 누른 논문 목록을 조회합니다. 최근 반응한 순서로 정렬됩니다.',
  })
  @ApiResponseType({
    type:    PaperListItemDto,
    isArray: true,
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getMyReactedPapers(@Req() req: Request & {
    user: User;
  }) {
    const papers = await this.paperFacade.getMyReactedPapers(req.user.id);

    return await this.mapPapersToListItemDto(papers, req.user.id);
  }

  @Get('me/discussed')
  @ApiOperation({
    summary:     'Get my discussed papers',
    description: '현재 로그인한 사용자가 토론에 참여한 논문 목록을 조회합니다. 최근 토론 참여 순서로 정렬됩니다.',
  })
  @ApiResponseType({
    type:    PaperListItemDto,
    isArray: true,
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getMyDiscussedPapers(@Req() req: Request & {
    user: User;
  }) {
    const papers = await this.paperFacade.getMyDiscussedPapers(req.user.id);

    return await this.mapPapersToListItemDto(papers, req.user.id);
  }

  @Get('me/recommended')
  @ApiOperation({
    summary:     'Get my recommended papers',
    description: '현재 로그인한 사용자에게 추천된 논문 목록을 조회합니다. 최신순으로 정렬되며, limit 파라미터로 반환할 항목 수를 제한할 수 있습니다(기본값: 20개).',
  })
  @ApiResponseType({
    type:    PaperListItemDto,
    isArray: true,
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getMyRecommendedPapers(@Req() req: Request & {
    user: User;
  }, @Query('limit') limit?: number) {
    const papers = await this.paperFacade.getMyRecommendedPapers(req.user.id, limit ?? 20);

    return await this.mapPapersToListItemDto(papers, req.user.id);
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
  @Public()
  async getPaperDetail(@Param('paperId') paperId: string, @Req() req: Request & {
    user?: User;
  }) {
    const userId = req.user?.id;
    const paper = await this.paperFacade.getPaperDetail(paperId, userId);

    // Get thumbnail URL if thumbnailId exists
    let thumbnailUrl: string | undefined;

    if (paper.thumbnailId) {
      try {
        const asset = await this.assetFacade.getAssetDetail(paper.thumbnailId);

        thumbnailUrl = asset.url;
      } catch {
        // Asset not found, skip
      }
    }

    // Get PDF URL from S3 if pdfId exists
    let pdfUrl: string | undefined;

    if (paper.pdfId) {
      try {
        const asset = await this.assetFacade.getAssetDetail(paper.pdfId);

        pdfUrl = asset.url;
      } catch {
        // Asset not found, fallback to paper.pdfUrl
        pdfUrl = paper.pdfUrl;
      }
    } else {
      pdfUrl = paper.pdfUrl;
    }

    // Set myReaction for anonymous users
    const myReaction = paper.myReaction ?? {
      isLiked:   false,
      isUnliked: false,
    };

    return {
      id:                paper.id,
      paperId:           paper.paperId,
      title:             paper.title,
      categories:        paper.categories,
      authors:           paper.authors,
      summary:           paper.summary,
      translatedSummary: paper.translatedSummary,
      content:           paper.content,
      doi:               paper.doi,
      url:               paper.url,
      pdfUrl,
      issuedAt:          paper.issuedAt,
      likeCount:         paper.likeCount,
      unlikeCount:       paper.unlikeCount,
      totalViewCount:    paper.totalViewCount,
      thumbnailUrl,
      pdfId:             paper.pdfId,
      createdAt:         paper.createdAt,
      updatedAt:         paper.updatedAt,
      myReaction,
    };
  }
}

