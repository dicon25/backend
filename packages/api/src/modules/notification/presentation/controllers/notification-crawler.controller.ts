import {
  Body,
  Controller,
  NotFoundException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiOperation,
  ApiProperty,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { CrawlerAuthGuard } from '@/common/guards';
import { ApiResponseType } from '@/common/lib/swagger/decorators';
import { EmailService } from '@/common/modules/email';
import { PrismaService } from '@/common/modules/prisma';
import { S3Service } from '@/common/modules/s3';
import { Public } from '@/modules/user/presentation/decorators';

export class SendTestEmailDto {
  @ApiProperty({ description: 'User ID to send email to' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ description: 'Paper ID to recommend' })
  @IsString()
  @IsNotEmpty()
  paperId: string;
}

export class MessageResponseDto {
  @ApiProperty()
  message: string;
}

@ApiTags('Crawler - Notifications')
@ApiSecurity('bearer')
@Controller('crawler/notifications')
@Public()
@UseGuards(CrawlerAuthGuard)
export class NotificationCrawlerController {
  constructor(private readonly emailService: EmailService,
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
    private readonly configService: ConfigService) {
  }

  @Post('test-email')
  @ApiOperation({
    summary:     'Send test email for paper recommendation',
    description: 'Crawler 권한으로 특정 사용자에게 특정 논문 추천 이메일을 테스트로 전송합니다.',
  })
  @ApiResponse({
    status:      200,
    description: 'Email sent successfully',
    type:        MessageResponseDto,
  })
  @ApiResponseType({ type: MessageResponseDto })
  async sendTestEmail(@Body() dto: SendTestEmailDto): Promise<MessageResponseDto> {
    // 사용자 정보 조회
    const user = await this.prisma.user.findUnique({
      where:  { id: dto.userId },
      select: {
        email: true, name: true,
      },
    });

    if (!user || !user.email) {
      throw new NotFoundException(`User ${dto.userId} not found or has no email`);
    }

    // 논문 정보 조회
    const paper = await this.prisma.paper.findUnique({
      where:   { id: dto.paperId },
      include: { thumbnail: true },
    });

    if (!paper) {
      throw new NotFoundException(`Paper ${dto.paperId} not found`);
    }

    // 논문 썸네일 URL 생성
    let thumbnailUrl: string | undefined;

    if (paper.thumbnailId && paper.thumbnail) {
      thumbnailUrl = this.s3Service.getPublicUrl(paper.thumbnail.key);
    }

    // 논문 URL 생성
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const paperUrl = `${frontendUrl}/papers/${paper.id}`;
    const discussionCount = await this.prisma.discussion.count({ where: { paperId: paper.id } });

    // 카테고리 (첫 번째 카테고리 사용, 없으면 첫 번째 해시태그)
    const category = paper.categories.length > 0
      ? paper.categories[0]
      : (paper.hashtags.length > 0 ? paper.hashtags[0] : '논문');

    // 요약 (번역된 요약이 있으면 사용, 없으면 원본 요약)
    const summary = paper.translatedSummary || paper.summary;

    // 이메일 전송
    await this.emailService.sendPaperRecommendationEmail(user.email, {
      userName:       user.name,
      userEmail:      user.email,
      paperTitle:     paper.title,
      paperCategory:  category,
      paperSummary:   summary,
      paperThumbnail: thumbnailUrl,
      paperUrl,
      likeCount:      paper.likeCount,
      commentCount:   discussionCount,
    });

    return { message: `Test email sent successfully to ${user.email} for paper ${paper.title}` };
  }
}

