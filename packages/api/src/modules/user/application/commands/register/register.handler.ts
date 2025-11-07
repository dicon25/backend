import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RegisterCommand } from './register.command';
import { ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '@/common/modules/redis';
import { PrismaService } from '@/common/modules/prisma';
import * as bcrypt from 'bcryptjs';

export interface RegisterResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

@CommandHandler(RegisterCommand)
export class RegisterHandler implements ICommandHandler<RegisterCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
  ) {}

  async execute(command: RegisterCommand): Promise<RegisterResult> {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: command.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(command.password, 10);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: command.email,
        password: hashedPassword,
        name: command.name,
      },
    });

    // Generate tokens
    const accessToken = this.jwtService.sign(
      { id: user.id, email: user.email },
      { expiresIn: '1h' },
    );

    const refreshToken = this.jwtService.sign(
      { id: user.id, email: user.email },
      { expiresIn: '7d' },
    );

    // Store refresh token in Redis
    await this.redisService.set(`refresh_token:${user.id}`, refreshToken, 7 * 24 * 60 * 60);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }
}

