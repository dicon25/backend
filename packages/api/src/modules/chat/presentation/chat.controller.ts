import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Request } from 'express';
import { JwtAuthGuard } from '@/modules/user/infrastructure/guards';
import { ChatFacade } from '../application/chat.facade';

// DTOs
class CreateSessionDto {
  @ApiProperty({
    description: 'Paper ID (optional)', required: false,
  })
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
  @ApiProperty({
    description: 'Page number', default: 1, required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Items per page', default: 50, required: false,
  })
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
  constructor(private readonly chatFacade: ChatFacade) {
  }

  @Post('sessions')
  @ApiOperation({
    summary:     'Create a new chat session',
    description: '새로운 채팅 세션을 생성합니다. 논문 ID를 선택적으로 제공할 수 있으며, 논문과 연관된 채팅 세션을 생성할 수 있습니다. 생성자는 현재 로그인한 사용자로 자동 설정됩니다.',
  })
  async createSession(@Body() dto: CreateSessionDto, @Req() req: Request & {
    user: any;
  }) {
    return await this.chatFacade.createSession(req.user.id, dto.paperId);
  }

  @Get('sessions')
  @ApiOperation({
    summary:     'Get my chat sessions',
    description: '현재 로그인한 사용자의 모든 채팅 세션 목록을 조회합니다. 세션 ID, 생성일, 연관된 논문 정보 등을 포함합니다.',
  })
  async getUserSessions(@Req() req: Request & {
    user: any;
  }) {
    return await this.chatFacade.getUserSessions(req.user.id);
  }

  @Get('sessions/:sessionId')
  @ApiOperation({
    summary:     'Get chat session detail',
    description: '채팅 세션 ID를 사용하여 특정 채팅 세션의 상세 정보를 조회합니다. 세션 정보와 연관된 논문 정보를 포함합니다. 자신의 세션만 조회할 수 있습니다.',
  })
  async getSession(@Param('sessionId') sessionId: string, @Req() req: Request & {
    user: any;
  }) {
    return await this.chatFacade.getSessionDetail(sessionId, req.user.id);
  }

  @Post('sessions/:sessionId/messages')
  @ApiOperation({
    summary:     'Send a message in a chat session',
    description: '특정 채팅 세션에 메시지를 전송합니다. 메시지 내용을 요청 본문에 포함해야 하며, 발신자는 현재 로그인한 사용자로 자동 설정됩니다. 자신의 세션에만 메시지를 보낼 수 있습니다.',
  })
  async sendMessage(@Param('sessionId') sessionId: string,
    @Body() dto: SendMessageDto,
    @Req() req: Request & {
      user: any;
    }) {
    return await this.chatFacade.sendMessage(sessionId, req.user.id, dto.content);
  }

  @Get('sessions/:sessionId/messages')
  @ApiOperation({
    summary:     'Get messages in a chat session',
    description: '특정 채팅 세션의 메시지 목록을 페이지네이션을 사용하여 조회합니다. 페이지 번호와 페이지당 항목 수를 쿼리 파라미터로 지정할 수 있으며, 기본값은 페이지 1, 페이지당 50개 항목입니다. 자신의 세션 메시지만 조회할 수 있습니다.',
  })
  async getMessages(@Param('sessionId') sessionId: string,
    @Query() query: ListDto,
    @Req() req: Request & {
      user: any;
    }) {
    return await this.chatFacade.getSessionMessages(sessionId,
      req.user.id,
      query.page ?? 1,
      query.limit ?? 50);
  }
}

