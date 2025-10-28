import { LogService } from '@common/modules/log';
import { RedisService } from '@common/modules/redis';
import { ACCESS_TOKEN_EXPIRES_IN, JwtPayload, REFRESH_TOKEN_EXPIRES_IN_SECONDS } from '@modules/user/domain';
import { UserRepository } from '@modules/user/infrastructure/persistence';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import { GoogleLoginCommand } from './google-login.command';
import { GoogleLoginResult } from './google-login.result';

@CommandHandler(GoogleLoginCommand)
export class GoogleLoginHandler implements ICommandHandler<GoogleLoginCommand, GoogleLoginResult> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    private readonly redis: RedisService,
    private readonly logger: LogService,
  ) {}

  async execute(command: GoogleLoginCommand): Promise<GoogleLoginResult> {
    // Check if user exists
    let user = await this.userRepository.findByProviderId(command.providerId);

    if (!user) {
      // Create new user
      user = await this.userRepository.createGoogleUser({
        providerId: command.providerId,
        email: command.email,
        name: command.name,
        // avatar URL will be handled separately if needed
      });

      this.logger.log('Auth', `New Google user created (User ID: ${user.id})`);
    } else {
      // Update user info if changed
      if (user.name !== command.name || user.email !== command.email) {
        user = await this.userRepository.updateUser(user.id, {
          name: command.name,
          email: command.email,
        });
      }

      this.logger.log('Auth', `Existing Google user logged in (User ID: ${user.id})`);
    }

    const tokens = await this.generateTokens(user.id);

    return GoogleLoginResult.from(tokens);
  }

  private async generateTokens(userId: string) {
    const accessTokenPayload: JwtPayload = {
      sub: userId,
      type: 'access',
    };

    const refreshTokenPayload: JwtPayload = {
      sub: userId,
      type: 'refresh',
    };

    const accessToken = this.jwtService.sign(accessTokenPayload, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
    const refreshToken = this.jwtService.sign(refreshTokenPayload, {
      expiresIn: `${REFRESH_TOKEN_EXPIRES_IN_SECONDS}s`,
    });

    await this.redis.sadd(`refresh:${userId}`, refreshToken);
    await this.redis.expire(`refresh:${userId}`, REFRESH_TOKEN_EXPIRES_IN_SECONDS);

    return {
      accessToken,
      refreshToken,
    };
  }
}

