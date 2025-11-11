import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { User } from '@scholub/database';
import { IsNotEmpty, IsString } from 'class-validator';
import { Request } from 'express';
import { PrismaService } from '@/common/modules/prisma';
import { ApiResponseType } from '@/common/lib/swagger/decorators';
import { JwtAuthGuard } from '@/modules/user/infrastructure/guards';

// DTOs
class StartChatDto {
  @ApiProperty({ description: 'Paper ID to chat about' })
  @IsString()
  @IsNotEmpty()
  paperId: string;
}

class StartChatResponseDto {
  @ApiProperty({ description: 'Success message' })
  message: string;

  @ApiProperty({ description: 'Activity ID' })
  activityId: string;
}

@ApiTags('Paper Chat')
@Controller('papers/chat')
export class PaperChatController {
  constructor(private readonly prisma: PrismaService) {
  }

  @Post('start')
  @ApiOperation({
    summary:     'Start chat session with AI about a paper',
    description: '논문에 대해 AI와 채팅을 시작합니다. CHAT_MESSAGE UserActivity를 기록합니다.',
  })
  @ApiResponseType({ type: StartChatResponseDto })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async startChat(@Body() dto: StartChatDto, @Req() req: Request & {
    user: User;
  }): Promise<StartChatResponseDto> {
    // Get paper by paperId
    const paper = await this.prisma.paper.findUnique({ where: { paperId: dto.paperId } });

    if (!paper) {
      throw new Error('Paper not found');
    }

    // Create CHAT_MESSAGE user activity
    const activity = await this.prisma.userActivity.create({ data: {
      userId:  req.user.id,
      paperId: paper.id,
      type:    'CHAT_MESSAGE',
    } });

    return {
      message:    'Chat session started successfully',
      activityId: activity.id,
    };
  }
}

