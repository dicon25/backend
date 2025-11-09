import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RegisterCommand } from './register.command';
import { ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '@/common/modules/redis';
import { PrismaService } from '@/common/modules/prisma';
import { S3Service } from '@/common/modules/s3';
import { AssetRepository } from '@/modules/asset/infrastructure';
import { JwtPayload } from '@modules/user/domain/types/jwt-payload.type';
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
    private readonly s3Service: S3Service,
    private readonly assetRepository: AssetRepository,
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

    // Upload profile picture if provided
    let avatarId: string | undefined;
    if (command.profilePicture) {
      const key = await this.s3Service.upload({
        file: command.profilePicture.buffer,
        filename: command.profilePicture.originalname,
        mimeType: command.profilePicture.mimetype,
        directory: 'avatars',
      });

      const asset = await this.assetRepository.create({
        filename: command.profilePicture.originalname,
        originalFilename: command.profilePicture.originalname,
        contentType: command.profilePicture.mimetype,
        fileSize: BigInt(command.profilePicture.size),
        key,
      });

      avatarId = asset.id;
    }

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: command.email,
        password: hashedPassword,
        name: command.name,
        avatarId,
      },
    });

    // Create user preference with interested categories
    await this.prisma.userPreference.create({
      data: {
        userId: user.id,
        interestedCategories: command.interestedCategories || [],
      },
    });

    // Generate tokens
    const accessTokenPayload: JwtPayload = {
      sub: user.id,
      type: 'access',
    };

    const refreshTokenPayload: JwtPayload = {
      sub: user.id,
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
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }
}

