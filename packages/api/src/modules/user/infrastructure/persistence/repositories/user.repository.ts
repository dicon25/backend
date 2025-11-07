import { PrismaService } from '@/common/modules/prisma';
import { UserEntity, UserEntitySafe } from '@modules/user/domain/entities/user.entity';
import { UserRepositoryPort } from '@modules/user/domain/repositories/user.repository.port';
import { Injectable, NotFoundException } from '@nestjs/common';
import { UserMapper } from '../mappers';

@Injectable()
export class UserRepository implements UserRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
  }

  async findById(id: string): Promise<UserEntitySafe | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      return null;
    }

    return UserMapper.toDomainSafe(user);
  }

  async findByIdOrThrow(id: string): Promise<UserEntitySafe> {
    const user = await this.findById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByIdWithPassword(id: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      return null;
    }

    return UserMapper.toDomain(user);
  }

  async findByEmail(email: string): Promise<UserEntitySafe | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      return null;
    }

    return UserMapper.toDomainSafe(user);
  }
}

