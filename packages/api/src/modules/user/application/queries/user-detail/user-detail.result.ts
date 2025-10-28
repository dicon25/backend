import { UserStatus } from '@scholub/database';
import { DataClass } from 'dataclasses';

export class UserDetailResult extends DataClass {
  id:     string;
  email:  string;
  status: UserStatus;

  createdAt: Date;
  updatedAt: Date;
}
