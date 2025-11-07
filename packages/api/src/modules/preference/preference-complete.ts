/**
 * Complete Preference Module
 */
import { Module, Injectable, Controller, Get, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { CqrsModule, CommandHandler, QueryHandler, ICommandHandler, IQueryHandler, CommandBus, QueryBus } from '@nestjs/cqrs';
import { PrismaService, PrismaModule } from '@/common/modules/prisma';
import { JwtAuthGuard } from '@/modules/user/infrastructure/guards';
import { UserModule } from '../user/user.module';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiProperty } from '@nestjs/swagger';
import { Request } from 'express';
import { IsOptional, IsArray, IsString, IsBoolean, IsNumber } from 'class-validator';

// Commands
export class UpdatePreferenceCommand {
  constructor(
    public readonly userId: string,
    public readonly data: {
      interestedCategories?: string[];
      excludedCategories?: string[];
      minYear?: number;
      enableNotifications?: boolean;
    },
  ) {}
}

// Queries
export class GetPreferenceQuery {
  constructor(public readonly userId: string) {}
}

// Handlers
@CommandHandler(UpdatePreferenceCommand)
export class UpdatePreferenceHandler implements ICommandHandler<UpdatePreferenceCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: UpdatePreferenceCommand) {
    return await this.prisma.userPreference.upsert({
      where: { userId: command.userId },
      update: command.data,
      create: {
        userId: command.userId,
        ...command.data,
      },
    });
  }
}

@QueryHandler(GetPreferenceQuery)
export class GetPreferenceHandler implements IQueryHandler<GetPreferenceQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetPreferenceQuery) {
    const preference = await this.prisma.userPreference.findUnique({
      where: { userId: query.userId },
    });

    if (!preference) {
      return await this.prisma.userPreference.create({
        data: { userId: query.userId },
      });
    }

    return preference;
  }
}

// Facade
@Injectable()
export class PreferenceFacade {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  async updatePreference(userId: string, data: any) {
    return await this.commandBus.execute(new UpdatePreferenceCommand(userId, data));
  }

  async getPreference(userId: string) {
    return await this.queryBus.execute(new GetPreferenceQuery(userId));
  }
}

// DTOs
export class UpdatePreferenceDto {
  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interestedCategories?: string[];

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludedCategories?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  minYear?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  enableNotifications?: boolean;
}

// Controller
@ApiTags('Preferences')
@Controller('preferences')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class PreferenceController {
  constructor(private readonly preferenceFacade: PreferenceFacade) {}

  @Get()
  @ApiOperation({ summary: 'Get my preferences' })
  async getPreference(@Req() req: Request & { user: any }) {
    return await this.preferenceFacade.getPreference(req.user.id);
  }

  @Patch()
  @ApiOperation({ summary: 'Update my preferences' })
  async updatePreference(@Body() dto: UpdatePreferenceDto, @Req() req: Request & { user: any }) {
    return await this.preferenceFacade.updatePreference(req.user.id, dto);
  }
}

// Module
const commandHandlers = [UpdatePreferenceHandler];
const queryHandlers = [GetPreferenceHandler];

@Module({
  imports: [CqrsModule, PrismaModule, UserModule],
  providers: [...commandHandlers, ...queryHandlers, PreferenceFacade],
  controllers: [PreferenceController],
  exports: [PreferenceFacade],
})
export class PreferenceModule {}



