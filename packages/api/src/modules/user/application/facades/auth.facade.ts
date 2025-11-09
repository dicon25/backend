import { Injectable } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { LoginCommand } from '../commands/login/login.command';
import { LoginResult } from '../commands/login/login.result';
import { LogoutCommand } from '../commands/logout/logout.command';
import { LogoutResult } from '../commands/logout/logout.result';
import { RefreshTokenCommand } from '../commands/refresh-token/refresh-token.command';
import { RefreshTokenResult } from '../commands/refresh-token/refresh-token.result';
import { ValidateAccessTokenQuery } from '../queries/validate-access-token/validate-access-token.query';
import { ValidateAccessTokenResult } from '../queries/validate-access-token/validate-access-token.result';

@Injectable()
export class AuthFacade {
  constructor(private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus) {
  }

  async login(email: string, password: string): Promise<LoginResult> {
    const command = LoginCommand.from({
      email, password,
    });

    return this.commandBus.execute<LoginCommand, LoginResult>(command);
  }

  async logout(userId: string, refreshToken: string): Promise<LogoutResult> {
    const command = LogoutCommand.from({
      userId, refreshToken,
    });

    return this.commandBus.execute<LogoutCommand, LogoutResult>(command);
  }

  async refreshToken(refreshToken: string): Promise<RefreshTokenResult> {
    const command = RefreshTokenCommand.from({ refreshToken });

    return this.commandBus.execute<RefreshTokenCommand, RefreshTokenResult>(command);
  }

  async validateAccessToken(accessToken: string): Promise<ValidateAccessTokenResult> {
    const query = ValidateAccessTokenQuery.from({ accessToken });

    return this.queryBus.execute<ValidateAccessTokenQuery, ValidateAccessTokenResult>(query);
  }
}

