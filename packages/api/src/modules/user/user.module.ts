import { PrismaModule } from '@/common/modules/prisma';
import { RedisModule } from '@/common/modules/redis';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { GoogleLoginHandler, LogoutHandler, RefreshTokenHandler } from './application/commands';
import { AuthFacade } from './application/facades';
import { UserDetailHandler, ValidateAccessTokenHandler } from './application/queries';
import { JwtAuthGuard } from './infrastructure/guards';
import { UserRepository } from './infrastructure/persistence';
import { AuthController, UserController } from './presentation/controllers';
import { GoogleStrategy, JwtStrategy } from './strategy';

const CommandHandlers = [GoogleLoginHandler, LogoutHandler, RefreshTokenHandler];

const QueryHandlers = [ValidateAccessTokenHandler, UserDetailHandler];

@Module({
  imports: [
    ConfigModule,
    CqrsModule,
    PassportModule,
    PrismaModule,
    RedisModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({ secret: configService.get<string>('JWT_SECRET') }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    ...CommandHandlers,
    ...QueryHandlers,
    AuthFacade,
    GoogleStrategy,
    JwtStrategy,
    JwtAuthGuard,
    UserRepository,
  ],
  controllers: [AuthController, UserController],
  exports: [AuthFacade, JwtModule, JwtAuthGuard],
})
export class UserModule {}
