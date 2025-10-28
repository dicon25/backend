import { AuthProvider, UserStatus } from '@scholub/database';
import { DataClass } from 'dataclasses';

export type UserEntitySafe = UserEntity;

export class UserEntity extends DataClass {
  id: string;
  email: string;
  provider: AuthProvider;
  providerId: string;
  name?: string;
  bio?: string;
  status: UserStatus;

  createdAt: Date;
  updatedAt: Date;

  isActive(): boolean {
    return this.status === 'ACTIVE';
  }

  isInactive(): boolean {
    return this.status === 'INACTIVE';
  }

  toSafeUser(): UserEntitySafe {
    return this;
  }
}

