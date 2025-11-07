/**
 * Complete Analytics Module for AI Server Data Collection
 */
import { Module, Injectable, Controller, Get, Query, UseGuards, Param } from '@nestjs/common';
import { PrismaService, PrismaModule } from '@/common/modules/prisma';
import { AiServerAuthGuard } from '@/common/guards';
import { ConfigModule } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiSecurity, ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';

// DTOs
export class DataQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 100;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

// Service
@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserActivities(query: DataQueryDto) {
    const skip = (query.page! - 1) * query.limit!;
    const where: any = {};

    if (query.startDate) {
      where.createdAt = { ...where.createdAt, gte: new Date(query.startDate) };
    }
    if (query.endDate) {
      where.createdAt = { ...where.createdAt, lte: new Date(query.endDate) };
    }

    const [activities, total] = await Promise.all([
      this.prisma.userActivity.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.userActivity.count({ where }),
    ]);

    return { activities, total, page: query.page, limit: query.limit };
  }

  async getReactions(query: DataQueryDto) {
    const skip = (query.page! - 1) * query.limit!;
    const where: any = {};

    if (query.startDate) {
      where.createdAt = { ...where.createdAt, gte: new Date(query.startDate) };
    }
    if (query.endDate) {
      where.createdAt = { ...where.createdAt, lte: new Date(query.endDate) };
    }

    const [reactions, total] = await Promise.all([
      this.prisma.reaction.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.reaction.count({ where }),
    ]);

    return { reactions, total, page: query.page, limit: query.limit };
  }

  async getPaperRelations(query: DataQueryDto) {
    const skip = (query.page! - 1) * query.limit!;

    const [relations, total] = await Promise.all([
      this.prisma.paperRelation.findMany({
        skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.paperRelation.count(),
    ]);

    return { relations, total, page: query.page, limit: query.limit };
  }

  async getPaperViews(query: DataQueryDto) {
    const skip = (query.page! - 1) * query.limit!;
    const where: any = {};

    if (query.startDate) {
      where.createdAt = { ...where.createdAt, gte: new Date(query.startDate) };
    }
    if (query.endDate) {
      where.createdAt = { ...where.createdAt, lte: new Date(query.endDate) };
    }

    const [views, total] = await Promise.all([
      this.prisma.paperView.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.paperView.count({ where }),
    ]);

    return { views, total, page: query.page, limit: query.limit };
  }

  async getUserProfile(userId: string) {
    const [user, preferences, subscriptions, reactions] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: false, status: true, createdAt: true },
      }),
      this.prisma.userPreference.findUnique({ where: { userId } }),
      this.prisma.subscription.findMany({ where: { userId } }),
      this.prisma.reaction.findMany({ where: { userId } }),
    ]);

    return { user, preferences, subscriptions, reactionCount: reactions.length };
  }
}

// Controller
@ApiTags('AI Data')
@ApiSecurity('X-Secret-Key')
@Controller('ai-data')
@UseGuards(AiServerAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('activities')
  @ApiOperation({ summary: 'Get user activities data (AI server only)' })
  async getActivities(@Query() query: DataQueryDto) {
    return await this.analyticsService.getUserActivities(query);
  }

  @Get('reactions')
  @ApiOperation({ summary: 'Get reactions data (AI server only)' })
  async getReactions(@Query() query: DataQueryDto) {
    return await this.analyticsService.getReactions(query);
  }

  @Get('relations')
  @ApiOperation({ summary: 'Get paper relations data (AI server only)' })
  async getRelations(@Query() query: DataQueryDto) {
    return await this.analyticsService.getPaperRelations(query);
  }

  @Get('views')
  @ApiOperation({ summary: 'Get paper views data (AI server only)' })
  async getViews(@Query() query: DataQueryDto) {
    return await this.analyticsService.getPaperViews(query);
  }

  @Get('users/:userId/profile')
  @ApiOperation({ summary: 'Get user profile and preferences (AI server only)' })
  async getUserProfile(@Param('userId') userId: string) {
    return await this.analyticsService.getUserProfile(userId);
  }
}

// Module
@Module({
  imports: [PrismaModule, ConfigModule],
  providers: [AnalyticsService, AiServerAuthGuard],
  controllers: [AnalyticsController],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}



