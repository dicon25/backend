import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { User } from '@scholub/database';
import { Request } from 'express';
import { ApiResponseType } from '@/common/lib/swagger/decorators';
import { PaperFacade } from '@/modules/paper/application/facades';
import { JwtAuthGuard } from '@/modules/user/infrastructure/guards';
import { Public } from '@/modules/user/presentation/decorators';
import {
  CategoryDto,
  ListPapersDto,
  PaperDetailDto,
  PaperListDto,
} from '../dtos';

@ApiTags('Papers')
@Controller('papers')
export class PaperController {
  constructor(private readonly paperFacade: PaperFacade) {
  }

  @Get()
  @ApiOperation({
    summary:     'Get papers list with pagination and filters',
    description: '논문 목록을 페이지네이션과 필터를 사용하여 조회합니다. 카테고리, 저자, 연도, 검색어로 필터링할 수 있으며, 정렬 옵션(정렬 기준 및 정렬 순서)을 지정할 수 있습니다. 기본값은 페이지 1, 페이지당 20개 항목입니다.',
  })
  @ApiResponseType({ type: PaperListDto })
  async listPapers(@Query() query: ListPapersDto) {
    return await this.paperFacade.listPapers({
      page:      query.page ?? 1,
      limit:     query.limit ?? 20,
      sortBy:    query.sortBy,
      sortOrder: query.sortOrder,
      filters:   {
        categories:  query.categories,
        authors:     query.authors,
        year:        query.year,
        searchQuery: query.searchQuery,
      },
    });
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

