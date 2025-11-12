import {
  Controller,
  Get,
  Injectable,
  Module,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  CommandBus,
  CommandHandler,
  CqrsModule,
  ICommandHandler,
  IQueryHandler,
  QueryBus,
  QueryHandler,
} from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Min } from 'class-validator';
import { Request } from 'express';
import { ApiResponseType } from '@/common/lib/swagger/decorators';
import { PrismaModule, PrismaService } from '@/common/modules/prisma';
import { JwtAuthGuard } from '@/modules/user/infrastructure/guards';
import { AssetModule } from '../asset';
import { AssetFacade } from '../asset/application/facades';
import { UserEntity } from '../user/domain';
import { UserModule } from '../user/user.module';
import { NotificationService } from './application/services/notification.service';

export class NotificationEntity {
  id:                   string;
  userId:               string;
  type:                 string;
  message:              string;
  relatedPaperId?:      string;
  relatedDiscussionId?: string;
  relatedUserId?:       string;
  isRead:               boolean;
  readAt?:              Date;
  createdAt:            Date;

  constructor(data: NotificationEntity) {
    Object.assign(this, data);
  }
}

// Commands
export class MarkAsReadCommand {
  constructor(public readonly notificationId: string,
    public readonly userId: string) {
  }
}

export class MarkAllAsReadCommand {
  constructor(public readonly userId: string) {
  }
}

// Queries
export class ListNotificationsQuery {
  constructor(public readonly userId: string,
    public readonly page: number,
    public readonly limit: number) {
  }
}

export class CountUnreadQuery {
  constructor(public readonly userId: string) {
  }
}

// Handlers
@CommandHandler(MarkAsReadCommand)
export class MarkAsReadHandler implements ICommandHandler<MarkAsReadCommand> {
  constructor(private readonly prisma: PrismaService) {
  }

  async execute(command: MarkAsReadCommand): Promise<void> {
    await this.prisma.notification.updateMany({
      where: {
        id:     command.notificationId,
        userId: command.userId,
      },
      data: {
        isRead: true,
        readAt: new Date,
      },
    });
  }
}

@CommandHandler(MarkAllAsReadCommand)
export class MarkAllAsReadHandler implements ICommandHandler<MarkAllAsReadCommand> {
  constructor(private readonly prisma: PrismaService) {
  }

  async execute(command: MarkAllAsReadCommand): Promise<void> {
    await this.prisma.notification.updateMany({
      where: {
        userId: command.userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date,
      },
    });
  }
}

@QueryHandler(ListNotificationsQuery)
export class ListNotificationsHandler implements IQueryHandler<ListNotificationsQuery> {
  constructor(private readonly prisma: PrismaService,
    private readonly assetFacade: AssetFacade) {
  }

  async execute(query: ListNotificationsQuery) {
    const skip = (query.page - 1) * query.limit;

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where:   { userId: query.userId },
        skip,
        take:    query.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          relatedPaper: { select: { thumbnailId: true } },
          relatedUser:  { select: { avatarId: true } },
        },
      }),
      this.prisma.notification.count({ where: { userId: query.userId } }),
    ]);

    // Map notifications with thumbnail URLs
    const notificationsWithUrls = await Promise.all(notifications.map(async n => {
      let paperThumbnailUrl: string | undefined;
      let userProfileImageUrl: string | undefined;

      // Get paper thumbnail URL if relatedPaperId exists
      if (n.relatedPaperId && n.relatedPaper?.thumbnailId) {
        try {
          const asset = await this.assetFacade.getAssetDetail(n.relatedPaper.thumbnailId);

          paperThumbnailUrl = asset.url;
        } catch {
          // Asset not found, skip
        }
      }

      // Get user profile image URL if relatedUserId exists
      if (n.relatedUserId && n.relatedUser?.avatarId) {
        try {
          const asset = await this.assetFacade.getAssetDetail(n.relatedUser.avatarId);

          userProfileImageUrl = asset.url;
        } catch {
          // Asset not found, skip
        }
      }

      return {
        id:                  n.id,
        userId:              n.userId,
        type:                n.type,
        message:             n.message,
        relatedPaperId:      n.relatedPaperId ?? undefined,
        relatedDiscussionId: n.relatedDiscussionId ?? undefined,
        relatedUserId:       n.relatedUserId ?? undefined,
        isRead:              n.isRead,
        readAt:              n.readAt ?? undefined,
        createdAt:           n.createdAt,
        paperThumbnailUrl,
        userProfileImageUrl,
      };
    }));

    return {
      notifications: notificationsWithUrls,
      total,
      page:          query.page,
      limit:         query.limit,
    };
  }
}

@QueryHandler(CountUnreadQuery)
export class CountUnreadHandler implements IQueryHandler<CountUnreadQuery> {
  constructor(private readonly prisma: PrismaService) {
  }

  async execute(query: CountUnreadQuery): Promise<{
    count: number;
  }> {
    const count = await this.prisma.notification.count({ where: {
      userId: query.userId,
      isRead: false,
    } });

    return { count };
  }
}

// Facade
@Injectable()
export class NotificationFacade {
  constructor(private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus) {
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    return await this.commandBus.execute(new MarkAsReadCommand(notificationId, userId));
  }

  async markAllAsRead(userId: string): Promise<void> {
    return await this.commandBus.execute(new MarkAllAsReadCommand(userId));
  }

  async listNotifications(userId: string, page: number, limit: number) {
    return await this.queryBus.execute(new ListNotificationsQuery(userId, page, limit));
  }

  async countUnread(userId: string): Promise<{
    count: number;
  }> {
    return await this.queryBus.execute(new CountUnreadQuery(userId));
  }
}

// DTOs
export class ListDto {
  @ApiProperty({
    description: 'Page number', default: 1, required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Items per page', default: 20, required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;
}

export class NotificationDto {
  @ApiProperty({ description: 'Notification ID' })
  id: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({
    description: 'Notification type',
    enum:        [
      'RECOMMENDED_PAPER', 'SIMILAR_PAPER', 'OPPOSING_PAPER', 'BOOKMARK_UPDATE', 'COMMENT_REPLY', 'DISCUSSION_ACTIVITY', 'WEEKLY_DIGEST', 'SYSTEM',
    ],
  })
  type: string;

  @ApiProperty({ description: 'Notification message' })
  message: string;

  @ApiProperty({
    description: 'Related paper ID', required: false,
  })
  relatedPaperId?: string;

  @ApiProperty({
    description: 'Related discussion ID', required: false,
  })
  relatedDiscussionId?: string;

  @ApiProperty({
    description: 'Related user ID', required: false,
  })
  relatedUserId?: string;

  @ApiProperty({
    description: 'Paper thumbnail URL (if relatedPaperId exists)', required: false,
  })
  paperThumbnailUrl?: string;

  @ApiProperty({
    description: 'User profile image URL (if relatedUserId exists)', required: false,
  })
  userProfileImageUrl?: string;

  @ApiProperty({ description: 'Is read' })
  isRead: boolean;

  @ApiProperty({
    description: 'Read at', required: false,
  })
  readAt?: Date;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;
}

export class NotificationListDto {
  @ApiProperty({
    type: [NotificationDto], description: 'Notifications',
  })
  notifications: NotificationDto[];

  @ApiProperty({ description: 'Total count' })
  total: number;

  @ApiProperty({ description: 'Current page' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;
}

export class UnreadCountDto {
  @ApiProperty({ description: 'Count of unread notifications' })
  count: number;
}

export class MessageResponseDto {
  @ApiProperty({ description: 'Response message' })
  message: string;
}

// Controller
@ApiTags('Notifications')
@Controller('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationFacade: NotificationFacade) {
  }

  @Get()
  @ApiOperation({
    summary:     'Get my notifications',
    description: '현재 로그인한 사용자의 알림 목록을 페이지네이션을 사용하여 조회합니다. 페이지 번호와 페이지당 항목 수를 쿼리 파라미터로 지정할 수 있으며, 기본값은 페이지 1, 페이지당 20개 항목입니다. 최신순으로 정렬됩니다.',
  })
  @ApiResponseType({ type: NotificationListDto })
  async listNotifications(@Query() query: ListDto, @Req() req: Request & {
    user: UserEntity;
  }) {
    return await this.notificationFacade.listNotifications(req.user.id,
      query.page ?? 1,
      query.limit ?? 20);
  }

  @Get('unread-count')
  @ApiOperation({
    summary:     'Get count of unread notifications',
    description: '현재 로그인한 사용자의 읽지 않은 알림 개수를 조회합니다.',
  })
  @ApiResponseType({ type: UnreadCountDto })
  async countUnread(@Req() req: Request & {
    user: UserEntity;
  }) {
    return await this.notificationFacade.countUnread(req.user.id);
  }

  @Patch(':notificationId/read')
  @ApiOperation({
    summary:     'Mark notification as read',
    description: '특정 알림을 읽음 처리합니다. 알림 ID를 URL 파라미터로 전달하며, 자신의 알림만 읽음 처리할 수 있습니다.',
  })
  @ApiResponseType({ type: MessageResponseDto })
  async markAsRead(@Param('notificationId') notificationId: string, @Req() req: Request & {
    user: UserEntity;
  }) {
    await this.notificationFacade.markAsRead(notificationId, req.user.id);

    return { message: 'Notification marked as read' };
  }

  @Patch('read-all')
  @ApiOperation({
    summary:     'Mark all notifications as read',
    description: '현재 로그인한 사용자의 모든 알림을 읽음 처리합니다.',
  })
  @ApiResponseType({ type: MessageResponseDto })
  async markAllAsRead(@Req() req: Request & {
    user: UserEntity;
  }) {
    await this.notificationFacade.markAllAsRead(req.user.id);

    return { message: 'All notifications marked as read' };
  }
}

// Module
const commandHandlers = [MarkAsReadHandler, MarkAllAsReadHandler];
const queryHandlers = [ListNotificationsHandler, CountUnreadHandler];

@Module({
  imports: [
    CqrsModule, PrismaModule, UserModule, AssetModule,
  ],
  providers: [
    ...commandHandlers, ...queryHandlers, NotificationFacade, NotificationService,
  ],
  controllers: [NotificationController],
  exports:     [NotificationFacade, NotificationService],
})
export class NotificationModule {
}

export {
  NotificationService,
} from './application/services/notification.service';

