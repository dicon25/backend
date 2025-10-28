import { ApiResponseType } from '@common/lib/swagger/decorators';
import {
    GoogleLoginCommand,
    GoogleLoginResult,
    LogoutCommand,
    LogoutResult,
    RefreshTokenCommand,
    RefreshTokenResult,
} from '@modules/user/application/commands';
import { UserEntity } from '@modules/user/domain/entities';
import { CurrentUser, Public } from '@modules/user/presentation/decorators';
import { LoginResponseDto, LogoutRequestDto, RefreshTokenRequestDto } from '@modules/user/presentation/dtos';
import { Body, Controller, Get, Logger, Post, Req, Res, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly commandBus: CommandBus) {}

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Initiates Google OAuth flow
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as any;

    const command = GoogleLoginCommand.from({
      providerId: user.providerId,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
    });

    const result = await this.commandBus.execute<GoogleLoginCommand, GoogleLoginResult>(command);

    // Redirect to frontend with tokens
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectUrl = `${frontendUrl}/auth/callback?accessToken=${result.accessToken}&refreshToken=${result.refreshToken}`;

    res.redirect(redirectUrl);
  }

  @Post('logout')
  @ApiResponseType({
    type: 'boolean',
    description: 'User logout successful',
    errors: [401, 500],
  })
  async logout(@CurrentUser() user: UserEntity, @Body() dto: LogoutRequestDto): Promise<boolean> {
    const command = LogoutCommand.from({
      userId: user.id,
      refreshToken: dto.refreshToken,
    });

    const result = await this.commandBus.execute<LogoutCommand, LogoutResult>(command);

    return result.success;
  }

  @Public()
  @Post('refresh')
  @ApiResponseType({
    type: LoginResponseDto,
    description: 'Token refresh successful',
    errors: [400, 401, 500],
  })
  async refreshToken(@Body() dto: RefreshTokenRequestDto): Promise<LoginResponseDto> {
    const command = RefreshTokenCommand.from(dto);
    const result = await this.commandBus.execute<RefreshTokenCommand, RefreshTokenResult>(command);

    return LoginResponseDto.from(result);
  }
}
