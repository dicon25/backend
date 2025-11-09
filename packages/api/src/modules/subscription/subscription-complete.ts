/**
 * Complete Subscription Module
 */
import {
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  Param,
  Patch,
  Post,
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
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { Request } from 'express';
import { PrismaModule, PrismaService } from '@/common/modules/prisma';
import { JwtAuthGuard } from '@/modules/user/infrastructure/guards';
import { UserModule } from '../user/user.module';

// Commands
export class SubscribeCommand {
  constructor(public readonly userId: string,
    public readonly type: string,
    public readonly target: string) {
  }
}

export class UnsubscribeCommand {
  constructor(public readonly subscriptionId: string,
    public readonly userId: string) {
  }
}

export class ToggleSubscriptionCommand {
  constructor(public readonly subscriptionId: string,
    public readonly userId: string) {
  }
}

// Queries
export class ListSubscriptionsQuery {
  constructor(public readonly userId: string) {
  }
}

// Handlers
@CommandHandler(SubscribeCommand)
export class SubscribeHandler implements ICommandHandler<SubscribeCommand> {
  constructor(private readonly prisma: PrismaService) {
  }

  async execute(command: SubscribeCommand) {
    return await this.prisma.subscription.upsert({
      where: { userId_type_target: {
        userId: command.userId,
        type:   command.type as any,
        target: command.target,
      } },
      update: { isActive: true },
      create: {
        userId:   command.userId,
        type:     command.type as any,
        target:   command.target,
        isActive: true,
      },
    });
  }
}

@CommandHandler(UnsubscribeCommand)
export class UnsubscribeHandler implements ICommandHandler<UnsubscribeCommand> {
  constructor(private readonly prisma: PrismaService) {
  }

  async execute(command: UnsubscribeCommand): Promise<void> {
    await this.prisma.subscription.deleteMany({ where: {
      id:     command.subscriptionId,
      userId: command.userId,
    } });
  }
}

@CommandHandler(ToggleSubscriptionCommand)
export class ToggleSubscriptionHandler implements ICommandHandler<ToggleSubscriptionCommand> {
  constructor(private readonly prisma: PrismaService) {
  }

  async execute(command: ToggleSubscriptionCommand) {
    const subscription = await this.prisma.subscription.findFirst({ where: {
      id:     command.subscriptionId,
      userId: command.userId,
    } });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    return await this.prisma.subscription.update({
      where: { id: command.subscriptionId },
      data:  { isActive: !subscription.isActive },
    });
  }
}

@QueryHandler(ListSubscriptionsQuery)
export class ListSubscriptionsHandler implements IQueryHandler<ListSubscriptionsQuery> {
  constructor(private readonly prisma: PrismaService) {
  }

  async execute(query: ListSubscriptionsQuery) {
    return await this.prisma.subscription.findMany({
      where:   { userId: query.userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}

// Facade
@Injectable()
export class SubscriptionFacade {
  constructor(private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus) {
  }

  async subscribe(userId: string, type: string, target: string) {
    return await this.commandBus.execute(new SubscribeCommand(userId, type, target));
  }

  async unsubscribe(subscriptionId: string, userId: string): Promise<void> {
    return await this.commandBus.execute(new UnsubscribeCommand(subscriptionId, userId));
  }

  async toggleSubscription(subscriptionId: string, userId: string) {
    return await this.commandBus.execute(new ToggleSubscriptionCommand(subscriptionId, userId));
  }

  async listSubscriptions(userId: string) {
    return await this.queryBus.execute(new ListSubscriptionsQuery(userId));
  }
}

// DTOs
export class SubscribeDto {
  @ApiProperty({ enum: [
    'CATEGORY', 'TAG', 'JOURNAL', 'AUTHOR',
  ] })
  @IsEnum([
    'CATEGORY', 'TAG', 'JOURNAL', 'AUTHOR',
  ])
  type: string;

  @ApiProperty({ description: 'Target to subscribe to' })
  @IsString()
  @IsNotEmpty()
  target: string;
}

// Controller
@ApiTags('Subscriptions')
@Controller('subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class SubscriptionController {
  constructor(private readonly subscriptionFacade: SubscriptionFacade) {
  }

  @Post()
  @ApiOperation({ summary: 'Subscribe to a category/tag/journal/author' })
  async subscribe(@Body() dto: SubscribeDto, @Req() req: Request & {
    user: any;
  }) {
    return await this.subscriptionFacade.subscribe(req.user.id, dto.type, dto.target);
  }

  @Delete(':subscriptionId')
  @ApiOperation({ summary: 'Unsubscribe' })
  async unsubscribe(@Param('subscriptionId') subscriptionId: string, @Req() req: Request & {
    user: any;
  }) {
    await this.subscriptionFacade.unsubscribe(subscriptionId, req.user.id);

    return { message: 'Unsubscribed successfully' };
  }

  @Patch(':subscriptionId/toggle')
  @ApiOperation({ summary: 'Toggle subscription active status' })
  async toggleSubscription(@Param('subscriptionId') subscriptionId: string, @Req() req: Request & {
    user: any;
  }) {
    return await this.subscriptionFacade.toggleSubscription(subscriptionId, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get my subscriptions' })
  async listSubscriptions(@Req() req: Request & {
    user: any;
  }) {
    return await this.subscriptionFacade.listSubscriptions(req.user.id);
  }
}

// Module
const commandHandlers = [
  SubscribeHandler, UnsubscribeHandler, ToggleSubscriptionHandler,
];

const queryHandlers = [ListSubscriptionsHandler];

@Module({
  imports: [
    CqrsModule, PrismaModule, UserModule,
  ],
  providers: [
    ...commandHandlers, ...queryHandlers, SubscriptionFacade,
  ],
  controllers: [SubscriptionController],
  exports:     [SubscriptionFacade],
})
export class SubscriptionModule {
}

