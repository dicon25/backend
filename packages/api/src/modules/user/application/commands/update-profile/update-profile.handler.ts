import { UserEntitySafe } from '@modules/user/domain/entities';
import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '@/common/modules/prisma';
import { S3Service } from '@/common/modules/s3';
import { AssetRepository } from '@/modules/asset/infrastructure';
import { UpdateProfileCommand } from './update-profile.command';

export interface UpdateProfileResult {
  user: UserEntitySafe;
}

@CommandHandler(UpdateProfileCommand)
export class UpdateProfileHandler implements ICommandHandler<UpdateProfileCommand, UpdateProfileResult> {
  constructor(private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
    private readonly assetRepository: AssetRepository) {
  }

  async execute(command: UpdateProfileCommand): Promise<UpdateProfileResult> {
    const existingUser = await this.prisma.user.findUnique({
      where:   { id: command.userId },
      include: { avatar: true },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    let avatarId = existingUser.avatarId;

    const oldAvatarId = existingUser.avatarId;

    if (command.profilePicture) {
      const key = await this.s3Service.upload({
        file:      command.profilePicture.buffer,
        filename:  command.profilePicture.originalname,
        mimeType:  command.profilePicture.mimetype,
        directory: 'avatars',
      });

      const asset = await this.assetRepository.create({
        filename:         command.profilePicture.originalname,
        originalFilename: command.profilePicture.originalname,
        contentType:      command.profilePicture.mimetype,
        fileSize:         BigInt(command.profilePicture.size),
        key,
      });

      avatarId = asset.id;

      if (oldAvatarId && existingUser.avatar) {
        try {
          await this.s3Service.delete(existingUser.avatar.key);

          await this.assetRepository.delete(oldAvatarId);
        } catch (error) {
          console.error('Failed to delete old avatar:', error);
        }
      }
    }

    const updateData: {
      name?: string; avatarId?: string;
    } = {};

    if (command.name !== undefined) {
      updateData.name = command.name;
    }

    if (avatarId !== null && avatarId !== undefined) {
      updateData.avatarId = avatarId;
    }

    const updatedUser = await this.prisma.user.update({
      where:   { id: command.userId },
      data:    updateData,
      include: { avatar: true },
    });

    return { user: {
      id:        updatedUser.id,
      email:     updatedUser.email,
      name:      updatedUser.name,
      status:    updatedUser.status,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    } as UserEntitySafe };
  }
}

