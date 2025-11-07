import { Controller, Get, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaperFacade } from '../../application/facades';
import { ListPapersDto, PaperDetailDto, PaperListDto, CategoryDto } from '../dtos';
import { ApiResponseType } from '@/common/lib/swagger/decorators';
import { JwtAuthGuard } from '@/modules/user/infrastructure/guards';
import { Request } from 'express';

@ApiTags('Papers')
@Controller('papers')
export class PaperController {
  constructor(private readonly paperFacade: PaperFacade) {}

  @Get()
  @ApiOperation({ summary: 'Get papers list with pagination and filters' })
  @ApiResponseType({ type: PaperListDto })
  async listPapers(@Query() query: ListPapersDto) {
    return await this.paperFacade.listPapers({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      filters: {
        categories: query.categories,
        authors: query.authors,
        year: query.year,
        searchQuery: query.searchQuery,
      },
    });
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get all categories with paper counts' })
  @ApiResponseType({ type: CategoryDto, isArray: true })
  async getCategories() {
    return await this.paperFacade.getCategories();
  }

  @Get('categories/:category')
  @ApiOperation({ summary: 'Get papers by category' })
  @ApiResponseType({ type: PaperListDto })
  async listPapersByCategory(@Param('category') category: string, @Query() query: ListPapersDto) {
    return await this.paperFacade.listPapersByCategory(category, {
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
  }

  @Get(':paperId')
  @ApiOperation({ summary: 'Get paper detail by paper ID' })
  @ApiResponseType({ type: PaperDetailDto })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getPaperDetail(@Param('paperId') paperId: string, @Req() req: Request & { user?: any }) {
    const userId = req.user?.id;
    return await this.paperFacade.getPaperDetail(paperId, userId);
  }
}



