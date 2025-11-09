import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { CrawlerAuthGuard } from '@/common/guards';
import { PrismaService } from '@/common/modules/prisma';
import { Public } from '@/modules/user/presentation/decorators';

export class UserActivityDto {
  userId: string;
  interestedHashtags: string[];
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
    description: '크롤러 전용 엔드포인트로, 모든 유저의 액티비티 정보를 조회합니다. 각 유저의 userId와 interestedHashtags(사용자의 해시태그 + 사용자가 본 논문들의 해시태그 집합)를 반환합니다.',
  })
  @ApiResponse({
    type:    [UserActivityDto],
    status:  200,
    description: '유저 액티비티 목록',
  })
  async getUserActivities(): Promise<UserActivityDto[]> {
    // Get all users
    const users = await this.prisma.user.findMany({
      select: {
        id:       true,
        hashtags: true,
      },
    });

    // Get all user paper views with paper hashtags
    const paperViews = await this.prisma.paperView.findMany({
      where: {
        userId: { not: null },
      },
      select: {
        userId: true,
        paper:  {
          select: {
            hashtags: true,
          },
        },
      },
    });

    // Group paper hashtags by user
    const userPaperHashtagsMap = new Map<string, Set<string>>();

    for (const view of paperViews) {
      if (view.userId) {
        if (!userPaperHashtagsMap.has(view.userId)) {
          userPaperHashtagsMap.set(view.userId, new Set());
        }

        const hashtags = view.paper.hashtags ?? [];

        for (const hashtag of hashtags) {
          userPaperHashtagsMap.get(view.userId)!.add(hashtag);
        }
      }
    }

    // Combine user hashtags with paper hashtags
    return users.map(user => {
      const userHashtags = user.hashtags ?? [];
      const paperHashtags = Array.from(userPaperHashtagsMap.get(user.id) ?? []);
      const interestedHashtags = Array.from(new Set([...userHashtags, ...paperHashtags]));

      return {
        userId:            user.id,
        interestedHashtags,
      };
    });
  }
}

