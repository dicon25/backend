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
import { Body, Controller, Post, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CommandBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { getMulterS3Uploader } from '@common/modules/s3/s3.config';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly commandBus: CommandBus) {}

  @Public()
  @Post('register')
  @UseInterceptors(FileInterceptor('profilePicture', getMulterS3Uploader({
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    maxSize: 5 * 1024 * 1024, // 5MB
  })))
  @ApiOperation({ summary: 'Register a new user' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          format: 'email',
          example: 'user@example.com',
        },
        password: {
          type: 'string',
          minLength: 6,
          example: 'password123',
        },
        name: {
          type: 'string',
          example: 'John Doe',
        },
        profilePicture: {
          type: 'string',
          format: 'binary',
          description: 'Profile picture image file (optional)',
        },
      },
      required: ['email', 'password', 'name'],
    },
  })
  @ApiResponseType({
    type: LoginResponseDto,
    description: 'User registration successful',
    errors: [400, 409, 500],
  })
  async register(
    @Body() dto: RegisterDto,
    @UploadedFile() profilePicture?: Express.Multer.File,
  ): Promise<LoginResponseDto> {
    const command = new RegisterCommand(dto.email, dto.password, dto.name, profilePicture);
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
