import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { CrawlerAuthGuard } from '@/common/guards';
import { PrismaService } from '@/common/modules/prisma';
import { Public } from '@/modules/user/presentation/decorators';

export class UserActivityDto {
  userId:             string;
  interestedHashtags: string[];
  interestedPaperIds: string[];
}

@ApiTags('Crawler - Users')
@ApiSecurity('bearer')
@Controller('crawler/users')
@Public()
@UseGuards(CrawlerAuthGuard)
export class UserCrawlerController {
  constructor(private readonly prisma: PrismaService) {
  }

  @Get('activities')
  @ApiOperation({
    summary:     'Get user activities with interested hashtags (crawler only)',
    description: '크롤러 전용 엔드포인트로, 모든 유저의 액티비티 정보를 조회합니다. 각 유저의 userId, interestedHashtags(사용자의 해시태그 + UserActivity에서 REACT_UNLIKE를 제외한 타입의 논문들의 hashtags 집합), interestedPaperIds(UserActivity에서 REACT_UNLIKE를 제외한 타입의 논문 ID 목록)를 반환합니다.',
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

    // Get all user activities (excluding REACT_UNLIKE) with paper hashtags and translatedHashtags
    const userActivities = await this.prisma.userActivity.findMany({
      where: {
        type: { not: 'REACT_UNLIKE' }, paperId: { not: null },
      },
      include: { paper: { select: {
        hashtags: true, translatedHashtags: true,
      } } },
    });

    // Group paper hashtags by user
    const userPaperHashtagsMap = new Map<string, Set<string>>;
    const userPaperIdsMap = new Map<string, Set<string>>;

    for (const activity of userActivities) {
      if (activity.userId && activity.paper) {
        if (!userPaperHashtagsMap.has(activity.userId)) {
          userPaperHashtagsMap.set(activity.userId, new Set);
        }

        if (!userPaperIdsMap.has(activity.userId)) {
          userPaperIdsMap.set(activity.userId, new Set);
        }

        // Add paper ID
        userPaperIdsMap.get(activity.userId)!.add(activity.paperId!);

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
        const interestedPaperIds = Array.from(userPaperIdsMap.get(user.id) ?? []);

        return {
          userId: user.id,
          interestedHashtags,
          interestedPaperIds,
        };
      })
      .filter(item => item.interestedHashtags.length > 0 || item.interestedPaperIds.length > 0);
  }
}

