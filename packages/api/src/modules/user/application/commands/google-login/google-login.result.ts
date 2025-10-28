export class GoogleLoginResult {
  accessToken: string;
  refreshToken: string;

  private constructor(data: GoogleLoginResult) {
    Object.assign(this, data);
  }

  static from(data: { accessToken: string; refreshToken: string }): GoogleLoginResult {
    return new GoogleLoginResult(data);
  }
}

