import { ApiResponseType } from '@common/lib/swagger/decorators';
import {
    LoginCommand,
    LoginResult,
    RegisterCommand,
    RegisterResult,
    LogoutCommand,
    LogoutResult,
    RefreshTokenCommand,
    RefreshTokenResult,
} from '@modules/user/application/commands';
import { UserEntity } from '@modules/user/domain/entities';
import { CurrentUser, Public } from '@modules/user/presentation/decorators';
import { LoginDto, RegisterDto, LoginResponseDto, LogoutRequestDto, RefreshTokenRequestDto } from '@modules/user/presentation/dtos';
import { Body, Controller, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly commandBus: CommandBus) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponseType({
    type: LoginResponseDto,
    description: 'User registration successful',
    errors: [400, 409, 500],
  })
  async register(@Body() dto: RegisterDto): Promise<LoginResponseDto> {
    const command = new RegisterCommand(dto.email, dto.password, dto.name);
    const result = await this.commandBus.execute<RegisterCommand, RegisterResult>(command);
    
    return LoginResponseDto.from({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponseType({
    type: LoginResponseDto,
    description: 'User login successful',
    errors: [401, 500],
  })
  async login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    const command = new LoginCommand(dto.email, dto.password);
    const result = await this.commandBus.execute<LoginCommand, LoginResult>(command);
    
    return LoginResponseDto.from({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout current user' })
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
  @ApiOperation({ summary: 'Refresh access token' })
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
