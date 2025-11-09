import { DataClass } from 'dataclasses';

export class LoginCommand extends DataClass {
  email:    string;
  password: string;
}

