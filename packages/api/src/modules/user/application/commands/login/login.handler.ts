import { JwtPayload } from '@modules/user/domain/types/jwt-payload.type';
import { UnauthorizedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '@/common/modules/prisma';
import { RedisService } from '@/common/modules/redis';
import { LoginCommand } from './login.command';

export interface LoginResult {
  accessToken:  string;
  refreshToken: string;
  user: {
    id:    string;
    email: string;
    name?: string;
  };
}

@CommandHandler(LoginCommand)
export class LoginHandler implements ICommandHandler<LoginCommand> {
  constructor(private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService) {
  }

  async execute(command: LoginCommand): Promise<LoginResult> {
    // Find user
    const user = await this.prisma.user.findUnique({ where: { email: command.email } });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(command.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Generate tokens
    const accessTokenPayload: JwtPayload = {
      sub:  user.id,
      type: 'access',
    };

    const refreshTokenPayload: JwtPayload = {
      sub:  user.id,
      type: 'refresh',
    };

    const accessToken = this.jwtService.sign(accessTokenPayload, { expiresIn: '1h' });
    const refreshToken = this.jwtService.sign(refreshTokenPayload, { expiresIn: '7d' });

    // Store refresh token in Redis Set
    await this.redisService.sadd(`refresh:${user.id}`, refreshToken);

    await this.redisService.expire(`refresh:${user.id}`, 7 * 24 * 60 * 60);

    return {
      accessToken,
      refreshToken,
      user: {
        id:    user.id,
        email: user.email,
        name:  user.name ?? undefined,
      },
    };
  }
}

