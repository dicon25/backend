import { PrismaService } from '@/common/modules/prisma';
import { UserEntitySafe } from '@modules/user/domain/entities/user.entity';
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

  async findByEmail(email: string): Promise<UserEntitySafe | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      return null;
    }

    return UserMapper.toDomainSafe(user);
  }

  async findByProviderId(providerId: string): Promise<UserEntitySafe | null> {
    const user = await this.prisma.user.findUnique({ where: { providerId } });

    if (!user) {
      return null;
    }

    return UserMapper.toDomainSafe(user);
  }

  async createGoogleUser(data: {
    providerId: string;
    email: string;
    name?: string;
  }): Promise<UserEntitySafe> {
    const user = await this.prisma.user.create({
      data: {
        providerId: data.providerId,
        email: data.email,
        name: data.name,
        provider: 'GOOGLE',
        status: 'ACTIVE',
      },
    });

    return UserMapper.toDomainSafe(user);
  }

  async updateUser(
    id: string,
    data: {
      name?: string;
      email?: string;
      bio?: string;
    },
  ): Promise<UserEntitySafe> {
    const user = await this.prisma.user.update({
      where: { id },
      data,
    });

    return UserMapper.toDomainSafe(user);
  }
}

