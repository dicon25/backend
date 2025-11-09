import { ApiResponseType } from '@common/lib/swagger/decorators';
import { getMulterS3Uploader } from '@common/modules/s3/s3.config';
import {
  LoginCommand,
  LoginResult,
  LogoutCommand,
  LogoutResult,
  RefreshTokenCommand,
  RefreshTokenResult,
  RegisterCommand,
  RegisterResult,
} from '@modules/user/application/commands';
import { UserEntity } from '@modules/user/domain/entities';
import { CurrentUser, Public } from '@modules/user/presentation/decorators';
import {
  LoginDto,
  LoginResponseDto,
  LogoutRequestDto,
  RefreshTokenRequestDto,
  RegisterDto,
} from '@modules/user/presentation/dtos';
import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly commandBus: CommandBus) {
  }

  @Public()
  @Post('register')
  @UseInterceptors(FileInterceptor('profilePicture', getMulterS3Uploader({
    extensions: [
      '.jpg', '.jpeg', '.png', '.gif', '.webp',
    ],
    maxSize: 5 * 1024 * 1024,
  })))
  @ApiOperation({
    summary: 'Register a new user',
    description: '새로운 사용자 계정을 생성합니다. 이메일, 비밀번호, 이름을 필수로 입력받으며, 프로필 사진은 선택사항입니다. 회원가입 성공 시 자동으로 로그인되어 액세스 토큰과 리프레시 토큰을 반환합니다. 프로필 사진은 최대 5MB까지 업로드 가능하며, JPG, JPEG, PNG, GIF, WEBP 형식을 지원합니다.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: {
    type:       'object',
    properties: {
      email: {
        type:    'string',
        format:  'email',
        example: 'user@example.com',
      },
      password: {
        type:      'string',
        minLength: 6,
        example:   'password123',
      },
      name: {
        type:    'string',
        example: 'John Doe',
      },
      profilePicture: {
        type:        'string',
        format:      'binary',
        description: 'Profile picture image file (optional)',
      },
    },
    required: [
      'email', 'password', 'name',
    ],
  } })
  @ApiResponseType({
    type:        LoginResponseDto,
    description: 'User registration successful',
    errors:      [
      400, 409, 500,
    ],
  })
  async register(@Body() dto: RegisterDto,
    @UploadedFile() profilePicture?: Express.Multer.File): Promise<LoginResponseDto> {
    const command = new RegisterCommand(dto.email, dto.password, dto.name, profilePicture);
    const result = await this.commandBus.execute<RegisterCommand, RegisterResult>(command);

    return LoginResponseDto.from({
      accessToken:  result.accessToken,
      refreshToken: result.refreshToken,
    });
  }

  @Public()
  @Post('login')
  @ApiOperation({
    summary: 'Login with email and password',
    description: '이메일과 비밀번호를 사용하여 사용자를 인증하고 로그인합니다. 인증 성공 시 액세스 토큰과 리프레시 토큰을 반환합니다. 액세스 토큰은 API 요청 시 Authorization 헤더에 포함하여 사용하며, 리프레시 토큰은 액세스 토큰 만료 시 새로운 토큰을 발급받는 데 사용합니다.',
  })
  @ApiResponseType({
    type:        LoginResponseDto,
    description: 'User login successful',
    errors:      [401, 500],
  })
  async login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    const command = new LoginCommand(dto.email, dto.password);
    const result = await this.commandBus.execute<LoginCommand, LoginResult>(command);

    return LoginResponseDto.from({
      accessToken:  result.accessToken,
      refreshToken: result.refreshToken,
    });
  }

  @Post('logout')
  @ApiOperation({
    summary: 'Logout current user',
    description: '현재 로그인한 사용자를 로그아웃 처리합니다. 전달받은 리프레시 토큰을 무효화하여 해당 토큰으로는 더 이상 토큰 갱신이 불가능하도록 합니다. 액세스 토큰은 클라이언트에서 삭제해야 하며, 서버에서는 리프레시 토큰만 무효화합니다.',
  })
  @ApiResponseType({
    type:        'boolean',
    description: 'User logout successful',
    errors:      [401, 500],
  })
  async logout(@CurrentUser() user: UserEntity, @Body() dto: LogoutRequestDto): Promise<boolean> {
    const command = LogoutCommand.from({
      userId:       user.id,
      refreshToken: dto.refreshToken,
    });

    const result = await this.commandBus.execute<LogoutCommand, LogoutResult>(command);

    return result.success;
  }

  @Public()
  @Post('refresh')
  @ApiOperation({
    summary: 'Refresh access token',
    description: '만료된 액세스 토큰을 리프레시 토큰을 사용하여 갱신합니다. 리프레시 토큰이 유효한 경우 새로운 액세스 토큰과 리프레시 토큰을 발급합니다. 리프레시 토큰이 만료되었거나 무효한 경우 에러를 반환합니다.',
  })
  @ApiResponseType({
    type:        LoginResponseDto,
    description: 'Token refresh successful',
    errors:      [
      400, 401, 500,
    ],
  })
  async refreshToken(@Body() dto: RefreshTokenRequestDto): Promise<LoginResponseDto> {
    const command = RefreshTokenCommand.from(dto);
    const result = await this.commandBus.execute<RefreshTokenCommand, RefreshTokenResult>(command);

    return LoginResponseDto.from(result);
  }
}
