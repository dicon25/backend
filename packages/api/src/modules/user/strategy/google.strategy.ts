import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly configService: ConfigService) {
    super({
      clientID:     configService.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL:  configService.get<string>('GOOGLE_CALLBACK_URL'),
      scope:        ['email', 'profile'],
    });
  }

  async validate(accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback): Promise<any> {
    const {
      id,
      emails,
      displayName,
      photos,
    } = profile;

    const user = {
      providerId: id,
      email:      emails?.[0]?.value,
      name:       displayName,
      avatar:     photos?.[0]?.value,
      accessToken,
    };

    done(null, user);
  }
}

