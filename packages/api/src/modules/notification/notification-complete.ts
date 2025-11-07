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

// Controller
@ApiTags('Notifications')
@Controller('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationFacade: NotificationFacade) {}

  @Get()
  @ApiOperation({ summary: 'Get my notifications' })
  async listNotifications(@Query() query: ListDto, @Req() req: Request & { user: any }) {
    return await this.notificationFacade.listNotifications(
      req.user.id,
      query.page ?? 1,
      query.limit ?? 20,
    );
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get count of unread notifications' })
  async countUnread(@Req() req: Request & { user: any }) {
    return await this.notificationFacade.countUnread(req.user.id);
  }

  @Patch(':notificationId/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(@Param('notificationId') notificationId: string, @Req() req: Request & { user: any }) {
    await this.notificationFacade.markAsRead(notificationId, req.user.id);
    return { message: 'Notification marked as read' };
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
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



