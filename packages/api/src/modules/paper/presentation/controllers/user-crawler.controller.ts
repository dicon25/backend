import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiProperty,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { NotificationType } from '@scholub/database';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { CrawlerAuthGuard } from '@/common/guards';
import { ApiResponseType } from '@/common/lib/swagger/decorators';
import { PrismaService } from '@/common/modules/prisma';
import { NotificationService } from '@/modules/notification/application/services/notification.service';
import { Public } from '@/modules/user/presentation/decorators';

export class UserActivityDto {
  userId:              string;
  interestedHashtags:  string[];
  interestedPaperUrls: string[];
  interestedPaperIds:  string[];
}

export class CreateNotificationDto {
  @ApiProperty({
    description: 'Notification type',
    enum:        [
      'RECOMMENDED_PAPER', 'SIMILAR_PAPER', 'OPPOSING_PAPER', 'DISCUSSION_ACTIVITY', 'SYSTEM',
    ],
  })
  @IsEnum([
    'RECOMMENDED_PAPER', 'SIMILAR_PAPER', 'OPPOSING_PAPER', 'DISCUSSION_ACTIVITY', 'SYSTEM',
  ])
  @IsNotEmpty()
  type: NotificationType;

  @ApiProperty({ description: 'Notification message' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({
    description: 'Related paper ID', required: false,
  })
  @IsOptional()
  @IsString()
  relatedPaperId?: string;

  @ApiProperty({
    description: 'Related discussion ID', required: false,
  })
  @IsOptional()
  @IsString()
  relatedDiscussionId?: string;

  @ApiProperty({
    description: 'Related user ID', required: false,
  })
  @IsOptional()
  @IsString()
  relatedUserId?: string;
}

export class CreateBulkNotificationDto {
  @ApiProperty({
    description: 'User IDs to send notification to',
    type:        [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  userIds: string[];

  @ApiProperty({
    description: 'Notification type',
    enum:        [
      'RECOMMENDED_PAPER', 'SIMILAR_PAPER', 'OPPOSING_PAPER', 'DISCUSSION_ACTIVITY', 'SYSTEM',
    ],
  })
  @IsEnum([
    'RECOMMENDED_PAPER', 'SIMILAR_PAPER', 'OPPOSING_PAPER', 'DISCUSSION_ACTIVITY', 'SYSTEM',
  ])
  @IsNotEmpty()
  type: NotificationType;

  @ApiProperty({ description: 'Notification message' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({
    description: 'Related paper ID', required: false,
  })
  @IsOptional()
  @IsString()
  relatedPaperId?: string;

  @ApiProperty({
    description: 'Related discussion ID', required: false,
  })
  @IsOptional()
  @IsString()
  relatedDiscussionId?: string;

  @ApiProperty({
    description: 'Related user ID', required: false,
  })
  @IsOptional()
  @IsString()
  relatedUserId?: string;
}

export class MessageResponseDto {
  @ApiProperty({ description: 'Response message' })
  message: string;
}

@ApiTags('Crawler - Users')
@ApiSecurity('bearer')
@Controller('crawler/users')
@Public()
@UseGuards(CrawlerAuthGuard)
export class UserCrawlerController {
  constructor(private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService) {
  }

  @Get('activities')
  @ApiOperation({
    summary:     'Get user activities with interested hashtags (crawler only)',
    description: '크롤러 전용 엔드포인트로, 모든 유저의 액티비티 정보를 조회합니다. 각 유저의 userId, interestedHashtags(사용자의 해시태그 + UserActivity에서 REACT_UNLIKE를 제외한 타입의 논문들의 hashtags 집합), interestedPaperUrls(UserActivity에서 REACT_UNLIKE를 제외한 타입의 논문 URL 목록), interestedPaperIds(UserActivity에서 REACT_UNLIKE를 제외한 타입의 논문 ID 목록, 각 ID에 .pdf 확장자가 붙어있음)를 반환합니다.',
  })
  @ApiResponse({
    type:        [UserActivityDto],
    status:      200,
    description: '유저 액티비티 목록',
  })
  async getUserActivities(): Promise<UserActivityDto[]> {
    // Get all users
    const users = await this.prisma.user.findMany({ select: {
      id:       true,
      hashtags: true,
    } });

    // Get all user activities (excluding REACT_UNLIKE) with paper hashtags, translatedHashtags, url, and paperId
    const userActivities = await this.prisma.userActivity.findMany({
      where: {
        type: { not: 'REACT_UNLIKE' }, paperId: { not: null },
      },
      include: { paper: { select: {
        hashtags: true, translatedHashtags: true, url: true, paperId: true,
      } } },
    });

    // Group paper hashtags, URLs, and IDs by user
    const userPaperHashtagsMap = new Map<string, Set<string>>;
    const userPaperUrlsMap = new Map<string, Set<string>>;
    const userPaperIdsMap = new Map<string, Set<string>>;

    for (const activity of userActivities) {
      if (activity.userId && activity.paper) {
        if (!userPaperHashtagsMap.has(activity.userId)) {
          userPaperHashtagsMap.set(activity.userId, new Set);
        }

        if (!userPaperUrlsMap.has(activity.userId)) {
          userPaperUrlsMap.set(activity.userId, new Set);
        }

        if (!userPaperIdsMap.has(activity.userId)) {
          userPaperIdsMap.set(activity.userId, new Set);
        }

        // Add paper URL if it exists
        if (activity.paper.url) {
          userPaperUrlsMap.get(activity.userId)!.add(activity.paper.url);
        }

        // Add paper ID with .pdf extension
        if (activity.paper.paperId) {
          userPaperIdsMap.get(activity.userId)!.add(`${activity.paper.paperId}.pdf`);
        }

        // Add hashtags
        const hashtags = [
          ...activity.paper.hashtags ?? [],
          ...activity.paper.translatedHashtags ?? [],
        ];

        for (const hashtag of hashtags) {
          userPaperHashtagsMap.get(activity.userId)!.add(hashtag);
        }
      }
    }

    // Combine user hashtags with paper hashtags from activities
    return users
      .map(user => {
        const userHashtags = user.hashtags ?? [];
        const activityHashtags = Array.from(userPaperHashtagsMap.get(user.id) ?? []);
        const interestedHashtags = Array.from(new Set([...userHashtags, ...activityHashtags]));
        const interestedPaperUrls = Array.from(userPaperUrlsMap.get(user.id) ?? []);
        const interestedPaperIds = Array.from(userPaperIdsMap.get(user.id) ?? []);

        return {
          userId: user.id,
          interestedHashtags,
          interestedPaperUrls,
          interestedPaperIds,
        };
      })
      .filter(item => item.interestedHashtags.length > 0 || item.interestedPaperUrls.length > 0 || item.interestedPaperIds.length > 0);
  }

  @Post(':userId/notifications')
  @ApiOperation({
    summary:     'Send notification to a user (crawler only)',
    description: '크롤러 전용 엔드포인트로, 특정 사용자에게 알림을 전송합니다. 알림 타입, 메시지, 관련 논문/토론/사용자 ID를 지정할 수 있습니다. 크롤러 인증이 필요합니다.',
  })
  @ApiResponseType({ type: MessageResponseDto })
  async sendNotification(@Param('userId') userId: string,
    @Body() dto: CreateNotificationDto): Promise<MessageResponseDto> {
    await this.notificationService.createNotification({
      userId:              userId,
      type:                dto.type,
      message:             dto.message,
      relatedPaperId:      dto.relatedPaperId,
      relatedDiscussionId: dto.relatedDiscussionId,
      relatedUserId:       dto.relatedUserId,
    });

    return { message: 'Notification sent successfully' };
  }

  @Post('notifications/bulk')
  @ApiOperation({
    summary:     'Send notifications to multiple users (crawler only)',
    description: '크롤러 전용 엔드포인트로, 여러 사용자에게 동일한 알림을 일괄 전송합니다. 사용자 ID 목록, 알림 타입, 메시지, 관련 논문/토론/사용자 ID를 지정할 수 있습니다. 크롤러 인증이 필요합니다.',
  })
  @ApiResponseType({ type: MessageResponseDto })
  async sendBulkNotifications(@Body() dto: CreateBulkNotificationDto): Promise<MessageResponseDto> {
    await this.notificationService.createBulkNotifications({
      userIds:             dto.userIds,
      type:                dto.type,
      message:             dto.message,
      relatedPaperId:      dto.relatedPaperId,
      relatedDiscussionId: dto.relatedDiscussionId,
      relatedUserId:       dto.relatedUserId,
    });

    return { message: `Notifications sent successfully to ${dto.userIds.length} users` };
  }
}

