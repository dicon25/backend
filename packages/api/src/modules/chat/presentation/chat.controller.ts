import { Controller, Post, Get, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChatFacade } from '../application/chat.facade';
import { JwtAuthGuard } from '@/modules/user/infrastructure/guards';
import { ApiResponseType } from '@/common/lib/swagger/decorators';
import { Request } from 'express';
import { IsString, IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// DTOs
class CreateSessionDto {
  @ApiProperty({ description: 'Paper ID (optional)', required: false })
  @IsOptional()
  @IsString()
  paperId?: string;
}

class SendMessageDto {
  @ApiProperty({ description: 'Message content' })
  @IsString()
  @IsNotEmpty()
  content: string;
}

class ListDto {
  @ApiProperty({ description: 'Page number', default: 1, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ description: 'Items per page', default: 50, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 50;
}

@ApiTags('Chat')
@Controller('chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatFacade: ChatFacade) {}

  @Post('sessions')
  @ApiOperation({ summary: 'Create a new chat session' })
  async createSession(@Body() dto: CreateSessionDto, @Req() req: Request & { user: any }) {
    return await this.chatFacade.createSession(req.user.id, dto.paperId);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'Get my chat sessions' })
  async getUserSessions(@Req() req: Request & { user: any }) {
    return await this.chatFacade.getUserSessions(req.user.id);
  }

  @Get('sessions/:sessionId')
  @ApiOperation({ summary: 'Get chat session detail' })
  async getSession(@Param('sessionId') sessionId: string, @Req() req: Request & { user: any }) {
    return await this.chatFacade.getSessionDetail(sessionId, req.user.id);
  }

  @Post('sessions/:sessionId/messages')
  @ApiOperation({ summary: 'Send a message in a chat session' })
  async sendMessage(
    @Param('sessionId') sessionId: string,
    @Body() dto: SendMessageDto,
    @Req() req: Request & { user: any },
  ) {
    return await this.chatFacade.sendMessage(sessionId, req.user.id, dto.content);
  }

  @Get('sessions/:sessionId/messages')
  @ApiOperation({ summary: 'Get messages in a chat session' })
  async getMessages(
    @Param('sessionId') sessionId: string,
    @Query() query: ListDto,
    @Req() req: Request & { user: any },
  ) {
    return await this.chatFacade.getSessionMessages(
      sessionId,
      req.user.id,
      query.page ?? 1,
      query.limit ?? 50,
    );
  }
}



