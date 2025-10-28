import { UserEntity, UserEntitySafe } from '@modules/user/domain/entities';
import type { User } from '@scholub/database';

export class UserMapper {
  static toDomain(user: User): UserEntity {
    return UserEntity.from(user);
  }

  static toDomainSafe(user: User): UserEntitySafe {
    return UserEntity.from(user);
  }

  static toDomainList(users: User[]): UserEntity[] {
    return users.map(user => this.toDomain(user));
  }
}

