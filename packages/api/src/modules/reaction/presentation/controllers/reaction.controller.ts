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
  @ApiOperation({ summary: 'Toggle reaction on a paper (LIKE/UNLIKE)' })
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
  @ApiOperation({ summary: 'Get paper reaction statistics' })
  @ApiResponseType({ type: ReactionStatsDto })
  async getPaperReactions(@Param('paperId') paperId: string) {
    return await this.reactionFacade.getPaperReactions(paperId);
  }

  @Get('users/me/reactions')
  @ApiOperation({ summary: 'Get my reactions' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiResponseType({ type: UserReactionsDto })
  async getUserReactions(@Query() query: GetUserReactionsDto, @Req() req: Request & { user: any }) {
    const userId = req.user.id;
    return await this.reactionFacade.getUserReactions(userId, query.page ?? 1, query.limit ?? 20);
  }
}



