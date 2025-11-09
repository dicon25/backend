import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DiscussionFacade } from '../application/discussion.facade';
import {
  CreateDiscussionDto,
  CreateMessageDto,
  UpdateMessageDto,
  ListDto,
  DiscussionDto,
  PaginatedDiscussionsDto,
  PaginatedMessagesDto,
} from './dtos';
import { JwtAuthGuard } from '@/modules/user/infrastructure/guards';
import { ApiResponseType } from '@/common/lib/swagger/decorators';
import { Request } from 'express';

@ApiTags('Discussions')
@Controller()
export class DiscussionController {
  constructor(private readonly discussionFacade: DiscussionFacade) {}

  @Post('papers/:paperId/discussions')
  @ApiOperation({
    summary: 'Create a new discussion for a paper',
    description: '특정 논문에 대한 새로운 토론을 생성합니다. 제목과 내용을 포함하여 토론을 시작하며, 생성자는 현재 로그인한 사용자로 자동 설정됩니다. 로그인이 필요합니다.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiResponseType({ type: DiscussionDto })
  async createDiscussion(
    @Param('paperId') paperId: string,
    @Body() dto: CreateDiscussionDto,
    @Req() req: Request & { user: any },
  ) {
    return await this.discussionFacade.createDiscussion(
      paperId,
      dto.title,
      dto.content,
      req.user.id,
    );
  }

  @Get('papers/:paperId/discussions')
  @ApiOperation({
    summary: 'Get discussions for a paper',
    description: '특정 논문에 대한 토론 목록을 페이지네이션을 사용하여 조회합니다. 페이지 번호와 페이지당 항목 수를 쿼리 파라미터로 지정할 수 있으며, 기본값은 페이지 1, 페이지당 20개 항목입니다. 인증이 필요하지 않습니다.',
  })
  @ApiResponseType({ type: PaginatedDiscussionsDto })
  async listDiscussions(@Param('paperId') paperId: string, @Query() query: ListDto) {
    return await this.discussionFacade.listDiscussionsByPaper(
      paperId,
      query.page ?? 1,
      query.limit ?? 20,
    );
  }

  @Get('discussions/:discussionId')
  @ApiOperation({
    summary: 'Get discussion detail',
    description: '토론 ID를 사용하여 특정 토론의 상세 정보를 조회합니다. 토론의 제목, 내용, 생성자, 생성일 등의 정보를 포함합니다. 인증이 필요하지 않습니다.',
  })
  @ApiResponseType({ type: DiscussionDto })
  async getDiscussion(@Param('discussionId') discussionId: string) {
    return await this.discussionFacade.getDiscussionDetail(discussionId);
  }

  @Post('discussions/:discussionId/messages')
  @ApiOperation({
    summary: 'Create a message in a discussion',
    description: '특정 토론에 새로운 메시지를 작성합니다. 메시지 내용을 요청 본문에 포함해야 하며, 작성자는 현재 로그인한 사용자로 자동 설정됩니다. 로그인이 필요합니다.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async createMessage(
    @Param('discussionId') discussionId: string,
    @Body() dto: CreateMessageDto,
    @Req() req: Request & { user: any },
  ) {
    return await this.discussionFacade.createMessage(discussionId, req.user.id, dto.content);
  }

  @Get('discussions/:discussionId/messages')
  @ApiOperation({
    summary: 'Get messages in a discussion',
    description: '특정 토론의 메시지 목록을 페이지네이션을 사용하여 조회합니다. 페이지 번호와 페이지당 항목 수를 쿼리 파라미터로 지정할 수 있으며, 기본값은 페이지 1, 페이지당 20개 항목입니다. 로그인한 사용자의 경우 자신이 좋아요를 누른 메시지 정보도 함께 반환됩니다.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiResponseType({ type: PaginatedMessagesDto })
  async listMessages(
    @Param('discussionId') discussionId: string,
    @Query() query: ListDto,
    @Req() req: Request & { user?: any },
  ) {
    const userId = req.user?.id;
    return await this.discussionFacade.listMessages(
      discussionId,
      query.page ?? 1,
      query.limit ?? 20,
      userId,
    );
  }

  @Patch('discussions/:discussionId/messages/:messageId')
  @ApiOperation({
    summary: 'Update a message (owner only)',
    description: '토론 메시지를 수정합니다. 메시지 작성자만 자신의 메시지를 수정할 수 있습니다. 수정할 내용을 요청 본문에 포함해야 하며, 로그인이 필요합니다.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async updateMessage(
    @Param('messageId') messageId: string,
    @Body() dto: UpdateMessageDto,
    @Req() req: Request & { user: any },
  ) {
    return await this.discussionFacade.updateMessage(messageId, req.user.id, dto.content);
  }

  @Delete('discussions/:discussionId/messages/:messageId')
  @ApiOperation({
    summary: 'Delete a message (owner only)',
    description: '토론 메시지를 삭제합니다. 메시지 작성자만 자신의 메시지를 삭제할 수 있습니다. 로그인이 필요합니다.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async deleteMessage(
    @Param('messageId') messageId: string,
    @Req() req: Request & { user: any },
  ) {
    await this.discussionFacade.deleteMessage(messageId, req.user.id);
    return { message: 'Message deleted successfully' };
  }

  @Post('discussions/:discussionId/messages/:messageId/like')
  @ApiOperation({
    summary: 'Toggle like on a message',
    description: '토론 메시지에 대한 좋아요를 토글합니다. 이미 좋아요를 누른 경우 좋아요를 취소하고, 좋아요를 누르지 않은 경우 좋아요를 추가합니다. 로그인이 필요합니다.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async toggleMessageLike(
    @Param('messageId') messageId: string,
    @Req() req: Request & { user: any },
  ) {
    return await this.discussionFacade.toggleMessageLike(messageId, req.user.id);
  }
}



