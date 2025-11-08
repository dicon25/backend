import { UserEntity, UserEntitySafe } from '@modules/user/domain/entities';
import type { User } from '@scholub/database';

export class UserMapper {
  static toDomain(user: User): UserEntity {
    return UserEntity.from({
      id:        user.id,
      email:     user.email,
      password:  user.password,
      name:      user.name,
      status:    user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  }

  static toDomainSafe(user: User): UserEntitySafe {
    const entity = UserEntity.from({
      id:        user.id,
      email:     user.email,
      password:  user.password,
      name:      user.name,
      status:    user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });

    return entity.toSafeUser();
  }

  static toDomainList(users: User[]): UserEntity[] {
    return users.map(user => this.toDomain(user));
  }
}

