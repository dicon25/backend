import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { User } from '@scholub/database';
import { Request } from 'express';
import { ApiResponseType } from '@/common/lib/swagger/decorators';
import { JwtAuthGuard } from '@/modules/user/infrastructure/guards';
import { DiscussionFacade } from '../application/discussion.facade';
import {
  CreateDiscussionDto,
  CreateMessageDto,
  DiscussionDto,
  DiscussionMessageDto,
  UpdateMessageDto,
} from './dtos';

@ApiTags('Discussions')
@Controller()
export class DiscussionController {
  constructor(private readonly discussionFacade: DiscussionFacade) {
  }

  @Post('papers/:paperId/discussions')
  @ApiOperation({
    summary:     'Create a new discussion for a paper',
    description: '특정 논문에 대한 새로운 토론을 생성합니다. 제목과 내용을 포함하여 토론을 시작하며, 생성자는 현재 로그인한 사용자로 자동 설정됩니다. 로그인이 필요합니다.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiResponseType({ type: DiscussionDto })
  async createDiscussion(@Param('paperId') paperId: string,
    @Body() dto: CreateDiscussionDto,
    @Req() req: Request & {
      user: User;
    }) {
    return await this.discussionFacade.createDiscussion(paperId,
      dto.title,
      dto.content,
      req.user.id);
  }

  @Get('papers/:paperId/discussions')
  @ApiOperation({
    summary:     'Get discussions for a paper',
    description: '특정 논문에 대한 토론 목록을 조회합니다. 인증이 필요하지 않습니다.',
  })
  @ApiResponseType({
    type: DiscussionDto, isArray: true,
  })
  async listDiscussions(@Param('paperId') paperId: string) {
    return await this.discussionFacade.listDiscussionsByPaper(paperId);
  }

  @Get('discussions/:discussionId')
  @ApiOperation({
    summary:     'Get discussion detail',
    description: '토론 ID를 사용하여 특정 토론의 상세 정보를 조회합니다. 토론의 제목, 내용, 생성자, 생성일 등의 정보를 포함합니다. 인증이 필요하지 않습니다.',
  })
  @ApiResponseType({ type: DiscussionDto })
  async getDiscussion(@Param('discussionId') discussionId: string) {
    return await this.discussionFacade.getDiscussionDetail(discussionId);
  }

  @Post('discussions/:discussionId/messages')
  @ApiOperation({
    summary:     'Create a message in a discussion',
    description: '특정 토론에 새로운 메시지를 작성합니다. 메시지 내용을 요청 본문에 포함해야 하며, 작성자는 현재 로그인한 사용자로 자동 설정됩니다. 로그인이 필요합니다.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async createMessage(@Param('discussionId') discussionId: string,
    @Body() dto: CreateMessageDto,
    @Req() req: Request & {
      user: User;
    }) {
    return await this.discussionFacade.createMessage(discussionId, req.user.id, dto.content);
  }

  @Get('discussions/:discussionId/messages')
  @ApiOperation({
    summary:     'Get messages in a discussion',
    description: '특정 토론의 메시지 목록을 조회합니다.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiResponseType({
    type: DiscussionMessageDto, isArray: true,
  })
  async listMessages(@Param('discussionId') discussionId: string,
    @Req() req: Request & {
      user?: User;
    }) {
    const userId = req.user?.id;

    return await this.discussionFacade.listMessages(discussionId, userId);
  }

  @Patch('discussions/:discussionId/messages/:messageId')
  @ApiOperation({
    summary:     'Update a message (owner only)',
    description: '토론 메시지를 수정합니다. 메시지 작성자만 자신의 메시지를 수정할 수 있습니다. 수정할 내용을 요청 본문에 포함해야 하며, 로그인이 필요합니다.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async updateMessage(@Param('messageId') messageId: string,
    @Body() dto: UpdateMessageDto,
    @Req() req: Request & {
      user: User;
    }) {
    return await this.discussionFacade.updateMessage(messageId, req.user.id, dto.content);
  }

  @Delete('discussions/:discussionId/messages/:messageId')
  @ApiOperation({
    summary:     'Delete a message (owner only)',
    description: '토론 메시지를 삭제합니다. 메시지 작성자만 자신의 메시지를 삭제할 수 있습니다. 로그인이 필요합니다.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async deleteMessage(@Param('messageId') messageId: string,
    @Req() req: Request & {
      user: User;
    }) {
    await this.discussionFacade.deleteMessage(messageId, req.user.id);

    return { message: 'Message deleted successfully' };
  }
}

