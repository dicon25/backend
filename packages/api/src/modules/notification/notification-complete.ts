/**
 * Complete Notification Module Implementation
 * This file combines domain, application, infrastructure, and presentation layers
 */

import { Module, Injectable, Controller, Get, Patch, Param, Query, UseGuards, Req } from '@nestjs/common';
import { CqrsModule, CommandHandler, QueryHandler, ICommandHandler, IQueryHandler, CommandBus, QueryBus } from '@nestjs/cqrs';
import { PrismaService, PrismaModule } from '@/common/modules/prisma';
import { JwtAuthGuard } from '@/modules/user/infrastructure/guards';
import { UserModule } from '../user/user.module';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiProperty } from '@nestjs/swagger';
import { ApiResponseType } from '@/common/lib/swagger/decorators';
import { Request } from 'express';
import { IsOptional, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

// Domain Entities
export class NotificationEntity {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  relatedPaperId?: string;
  relatedUserId?: string;
  isRead: boolean;
  readAt?: Date;
  priority: string;
  createdAt: Date;

  constructor(data: NotificationEntity) {
    Object.assign(this, data);
  }
}

// Commands
export class MarkAsReadCommand {
  constructor(
    public readonly notificationId: string,
    public readonly userId: string,
  ) {}
}

export class MarkAllAsReadCommand {
  constructor(public readonly userId: string) {}
}

// Queries
export class ListNotificationsQuery {
  constructor(
    public readonly userId: string,
    public readonly page: number,
    public readonly limit: number,
  ) {}
}

export class CountUnreadQuery {
  constructor(public readonly userId: string) {}
}

// Handlers
@CommandHandler(MarkAsReadCommand)
export class MarkAsReadHandler implements ICommandHandler<MarkAsReadCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: MarkAsReadCommand): Promise<void> {
    await this.prisma.notification.updateMany({
      where: {
        id: command.notificationId,
        userId: command.userId,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }
}

@CommandHandler(MarkAllAsReadCommand)
export class MarkAllAsReadHandler implements ICommandHandler<MarkAllAsReadCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: MarkAllAsReadCommand): Promise<void> {
    await this.prisma.notification.updateMany({
      where: {
        userId: command.userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }
}

@QueryHandler(ListNotificationsQuery)
export class ListNotificationsHandler implements IQueryHandler<ListNotificationsQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: ListNotificationsQuery) {
    const skip = (query.page - 1) * query.limit;

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId: query.userId },
        skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where: { userId: query.userId } }),
    ]);

    return {
      notifications: notifications.map((n) => new NotificationEntity(n as any)),
      total,
      page: query.page,
      limit: query.limit,
    };
  }
}

@QueryHandler(CountUnreadQuery)
export class CountUnreadHandler implements IQueryHandler<CountUnreadQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: CountUnreadQuery): Promise<{ count: number }> {
    const count = await this.prisma.notification.count({
      where: {
        userId: query.userId,
        isRead: false,
      },
    });
    return { count };
  }
}

// Facade
@Injectable()
export class NotificationFacade {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    return await this.commandBus.execute(new MarkAsReadCommand(notificationId, userId));
  }

  async markAllAsRead(userId: string): Promise<void> {
    return await this.commandBus.execute(new MarkAllAsReadCommand(userId));
  }

  async listNotifications(userId: string, page: number, limit: number) {
    return await this.queryBus.execute(new ListNotificationsQuery(userId, page, limit));
  }

  async countUnread(userId: string): Promise<{ count: number }> {
    return await this.queryBus.execute(new CountUnreadQuery(userId));
  }
}

// DTOs
export class ListDto {
  @ApiProperty({ description: 'Page number', default: 1, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ description: 'Items per page', default: 20, required: false })
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

  @ApiProperty({ description: 'Notification type', enum: ['RECOMMENDED_PAPER', 'SIMILAR_PAPER', 'OPPOSING_PAPER', 'BOOKMARK_UPDATE', 'COMMENT_REPLY', 'DISCUSSION_ACTIVITY', 'WEEKLY_DIGEST', 'SYSTEM'] })
  type: string;

  @ApiProperty({ description: 'Notification title' })
  title: string;

  @ApiProperty({ description: 'Notification message' })
  message: string;

  @ApiProperty({ description: 'Related paper ID', required: false })
  relatedPaperId?: string;

  @ApiProperty({ description: 'Related user ID', required: false })
  relatedUserId?: string;

  @ApiProperty({ description: 'Is read' })
  isRead: boolean;

  @ApiProperty({ description: 'Read at', required: false })
  readAt?: Date;

  @ApiProperty({ description: 'Priority', enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'] })
  priority: string;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;
}

export class NotificationListDto {
  @ApiProperty({ type: [NotificationDto], description: 'Notifications' })
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
  constructor(private readonly notificationFacade: NotificationFacade) {}

  @Get()
  @ApiOperation({
    summary:     'Get my notifications',
    description: '현재 로그인한 사용자의 알림 목록을 페이지네이션을 사용하여 조회합니다. 페이지 번호와 페이지당 항목 수를 쿼리 파라미터로 지정할 수 있으며, 기본값은 페이지 1, 페이지당 20개 항목입니다. 최신순으로 정렬됩니다.',
  })
  @ApiResponseType({ type: NotificationListDto })
  async listNotifications(@Query() query: ListDto, @Req() req: Request & { user: any }) {
    return await this.notificationFacade.listNotifications(
      req.user.id,
      query.page ?? 1,
      query.limit ?? 20,
    );
  }

  @Get('unread-count')
  @ApiOperation({
    summary:     'Get count of unread notifications',
    description: '현재 로그인한 사용자의 읽지 않은 알림 개수를 조회합니다.',
  })
  @ApiResponseType({ type: UnreadCountDto })
  async countUnread(@Req() req: Request & { user: any }) {
    return await this.notificationFacade.countUnread(req.user.id);
  }

  @Patch(':notificationId/read')
  @ApiOperation({
    summary:     'Mark notification as read',
    description: '특정 알림을 읽음 처리합니다. 알림 ID를 URL 파라미터로 전달하며, 자신의 알림만 읽음 처리할 수 있습니다.',
  })
  @ApiResponseType({ type: MessageResponseDto })
  async markAsRead(@Param('notificationId') notificationId: string, @Req() req: Request & { user: any }) {
    await this.notificationFacade.markAsRead(notificationId, req.user.id);
    return { message: 'Notification marked as read' };
  }

  @Patch('read-all')
  @ApiOperation({
    summary:     'Mark all notifications as read',
    description: '현재 로그인한 사용자의 모든 알림을 읽음 처리합니다.',
  })
  @ApiResponseType({ type: MessageResponseDto })
  async markAllAsRead(@Req() req: Request & { user: any }) {
    await this.notificationFacade.markAllAsRead(req.user.id);
    return { message: 'All notifications marked as read' };
  }
}

// Module
const commandHandlers = [MarkAsReadHandler, MarkAllAsReadHandler];
const queryHandlers = [ListNotificationsHandler, CountUnreadHandler];

@Module({
  imports: [CqrsModule, PrismaModule, UserModule],
  providers: [...commandHandlers, ...queryHandlers, NotificationFacade],
  controllers: [NotificationController],
  exports: [NotificationFacade],
})
export class NotificationModule {}



