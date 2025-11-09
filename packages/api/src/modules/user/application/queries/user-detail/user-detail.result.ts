import { UserStatus } from '@scholub/database';
import { DataClass } from 'dataclasses';

export class UserDetailResult extends DataClass {
  id:               string;
  email:            string;
  name:             string;
  status:           UserStatus;
  profileImageUrl?: string;

  createdAt: Date;
  updatedAt: Date;
}
