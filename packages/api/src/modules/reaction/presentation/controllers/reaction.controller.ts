import { Controller, Post, Get, Param, Body, UseGuards, Req, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReactionFacade } from '../../application/facades';
import { ToggleReactionDto, ReactionStatsDto, GetUserReactionsDto, UserReactionsDto } from '../dtos';
import { JwtAuthGuard } from '@/modules/user/infrastructure/guards';
import { ApiResponseType } from '@/common/lib/swagger/decorators';
import { Request } from 'express';

@ApiTags('Reactions')
@Controller()
export class ReactionController {
  constructor(private readonly reactionFacade: ReactionFacade) {}

  @Post('papers/:paperId/reactions')
  @ApiOperation({
    summary: 'Toggle reaction on a paper (LIKE/UNLIKE)',
    description: '논문에 대한 반응(좋아요)을 토글합니다. 이미 좋아요를 누른 경우 좋아요를 취소하고, 좋아요를 누르지 않은 경우 좋아요를 추가합니다. 반응 유형(LIKE 등)을 요청 본문에 포함해야 하며, 로그인이 필요합니다.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async toggleReaction(
    @Param('paperId') paperId: string,
    @Body() dto: ToggleReactionDto,
    @Req() req: Request & { user: any },
  ) {
    const userId = req.user.id;
    return await this.reactionFacade.toggleReaction(userId, paperId, dto.type);
  }

  @Get('papers/:paperId/reactions')
  @ApiOperation({
    summary: 'Get paper reaction statistics',
    description: '특정 논문에 대한 반응 통계 정보를 조회합니다. 각 반응 유형별 개수(예: 좋아요 개수)를 반환합니다. 인증이 필요하지 않습니다.',
  })
  @ApiResponseType({ type: ReactionStatsDto })
  async getPaperReactions(@Param('paperId') paperId: string) {
    return await this.reactionFacade.getPaperReactions(paperId);
  }

  @Get('users/me/reactions')
  @ApiOperation({
    summary: 'Get my reactions',
    description: '현재 로그인한 사용자가 좋아요를 누른 논문 목록을 페이지네이션을 사용하여 조회합니다. 페이지 번호와 페이지당 항목 수를 쿼리 파라미터로 지정할 수 있으며, 기본값은 페이지 1, 페이지당 20개 항목입니다.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiResponseType({ type: UserReactionsDto })
  async getUserReactions(@Query() query: GetUserReactionsDto, @Req() req: Request & { user: any }) {
    const userId = req.user.id;
    return await this.reactionFacade.getUserReactions(userId, query.page ?? 1, query.limit ?? 20);
  }
}



