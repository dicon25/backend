export class GoogleLoginCommand {
  providerId: string;
  email: string;
  name?: string;
  avatar?: string;

  private constructor(data: GoogleLoginCommand) {
    Object.assign(this, data);
  }

  static from(data: {
    providerId: string;
    email: string;
    name?: string;
    avatar?: string;
  }): GoogleLoginCommand {
    return new GoogleLoginCommand(data);
  }
}

