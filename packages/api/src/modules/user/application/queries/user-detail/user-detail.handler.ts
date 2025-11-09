import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '@/common/modules/prisma';
import { S3Service } from '@/common/modules/s3';
import { UserRepository } from '@/modules/user/infrastructure/persistence';
import { UserDetailQuery } from './user-detail.query';
import { UserDetailResult } from './user-detail.result';

@QueryHandler(UserDetailQuery)
export class UserDetailHandler implements IQueryHandler<UserDetailQuery, UserDetailResult> {
  constructor(private readonly userRepository: UserRepository,
    private readonly s3Service: S3Service,
    private readonly prisma: PrismaService) {
  }

  async execute(query: UserDetailQuery): Promise<UserDetailResult> {
    const { id } = query;
    const user = await this.userRepository.findByIdOrThrow(id);

    // Get user with avatar to check for profile image
    const userWithAvatar = await this.prisma.user.findUnique({
      where:   { id },
      include: { avatar: true },
    });

    // Get profile image URL if avatar exists
    let profileImageUrl: string | undefined;

    if (userWithAvatar?.avatar) {
      profileImageUrl = this.s3Service.getPublicUrl(userWithAvatar.avatar.key);
    }

    return UserDetailResult.from({
      id:        user.id,
      email:     user.email,
      name:      user.name,
      status:    user.status,
      profileImageUrl,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  }
}
