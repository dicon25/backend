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
  @ApiOperation({ summary: 'Create a new discussion for a paper' })
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
  @ApiOperation({ summary: 'Get discussions for a paper' })
  @ApiResponseType({ type: PaginatedDiscussionsDto })
  async listDiscussions(@Param('paperId') paperId: string, @Query() query: ListDto) {
    return await this.discussionFacade.listDiscussionsByPaper(
      paperId,
      query.page ?? 1,
      query.limit ?? 20,
    );
  }

  @Get('discussions/:discussionId')
  @ApiOperation({ summary: 'Get discussion detail' })
  @ApiResponseType({ type: DiscussionDto })
  async getDiscussion(@Param('discussionId') discussionId: string) {
    return await this.discussionFacade.getDiscussionDetail(discussionId);
  }

  @Post('discussions/:discussionId/messages')
  @ApiOperation({ summary: 'Create a message in a discussion' })
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
  @ApiOperation({ summary: 'Get messages in a discussion' })
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
  @ApiOperation({ summary: 'Update a message (owner only)' })
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
  @ApiOperation({ summary: 'Delete a message (owner only)' })
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
  @ApiOperation({ summary: 'Toggle like on a message' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async toggleMessageLike(
    @Param('messageId') messageId: string,
    @Req() req: Request & { user: any },
  ) {
    return await this.discussionFacade.toggleMessageLike(messageId, req.user.id);
  }
}



