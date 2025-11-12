import { ApiResponseType } from '@common/lib/swagger/decorators';
import { UpdateProfileCommand, UpdateProfileResult } from '@modules/user/application/commands';
import { UserDetailQuery, UserDetailResult } from '@modules/user/application/queries';
import { UserEntity } from '@modules/user/domain/entities';
import { CurrentUser } from '@modules/user/presentation/decorators';
import {
  Body,
  Controller,
  Get,
  Logger,
  NotFoundException,
  Param,
  Patch,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { PrismaService } from '@/common/modules/prisma';
import { S3Service } from '@/common/modules/s3';
import { getMulterS3Uploader } from '@/common/modules/s3/s3.config';
import { UpdateProfileDto } from '../dtos/request/update-profile.dto';
import { PublicUserProfileDto } from '../dtos/response/public-user-profile.dto';
import { UserDetailResponseDto } from '../dtos/response/user-detail.dto';

@ApiTags('User')
@Controller('users')
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {
  }

  @Get('me')
  @ApiOperation({
    summary:     'Get current user information',
    description: '현재 로그인한 사용자의 상세 정보를 조회합니다. 사용자 ID, 이메일, 이름, 프로필 사진 URL 등의 정보를 반환합니다. JWT 토큰에서 사용자 정보를 자동으로 추출합니다.',
  })
  @ApiResponseType({
    type:        UserDetailResponseDto,
    description: 'User detail successful',
    errors:      [
      400,
      401,
      500,
    ],
  })
  async detail(@CurrentUser() user: UserEntity): Promise<UserDetailResponseDto> {
    const query = UserDetailQuery.from({ id: user.id });
    const result = await this.queryBus.execute<UserDetailQuery, UserDetailResult>(query);

    return UserDetailResponseDto.from(result);
  }

  @Patch('me')
  @UseInterceptors(FileInterceptor('profilePicture', getMulterS3Uploader({
    extensions: [
      '.jpg', '.jpeg', '.png', '.gif', '.webp',
    ],
    maxSize: 5 * 1024 * 1024, // 5MB
  })))
  @ApiOperation({
    summary:     'Update user profile (name and/or profile picture)',
    description: '현재 로그인한 사용자의 프로필 정보를 수정합니다. 이름과 프로필 사진을 개별적으로 또는 함께 수정할 수 있습니다. 프로필 사진은 S3에 업로드되며, 최대 5MB까지 업로드 가능합니다. 지원되는 이미지 형식: JPG, JPEG, PNG, GIF, WEBP',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: {
    type:       'object',
    properties: {
      name: {
        type:        'string',
        example:     'John Doe',
        description: 'User name (optional)',
      },
      profilePicture: {
        type:        'string',
        format:      'binary',
        description: 'Profile picture image file (optional)',
      },
    },
  } })
  @ApiResponseType({
    type:        UserDetailResponseDto,
    description: 'Profile updated successfully',
    errors:      [
      400, 401, 404, 500,
    ],
  })
  async updateProfile(@CurrentUser() user: UserEntity,
    @Body() dto: UpdateProfileDto,
    @UploadedFile() profilePicture?: Express.Multer.File): Promise<UserDetailResponseDto> {
    const command = UpdateProfileCommand.from({
      userId:         user.id,
      name:            dto.name,
      profilePicture:  profilePicture,
    });
    const result = await this.commandBus.execute<UpdateProfileCommand, UpdateProfileResult>(command);    // Get updated user detail with profile image URL
    const query = UserDetailQuery.from({ id: result.user.id });
    const detailResult = await this.queryBus.execute<UserDetailQuery, UserDetailResult>(query);

    return UserDetailResponseDto.from(detailResult);
  }

  @Get(':userId/profile')
  @ApiOperation({
    summary:     'Get public user profile by userId',
    description: 'userId로 다른 사용자의 공개 프로필 정보(email, name, profileImageUrl)를 조회합니다. Private 엔드포인트로 로그인이 필요합니다.',
  })
  @ApiResponseType({
    type:        PublicUserProfileDto,
    description: 'User public profile',
    errors:      [
      400, 401, 404, 500,
    ],
  })
  async getUserProfile(@Param('userId') userId: string): Promise<PublicUserProfileDto> {
    const user = await this.prisma.user.findUnique({
      where:   { id: userId },
      include: { avatar: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    let profileImageUrl: string | undefined;

    if (user.avatar) {
      profileImageUrl = this.s3Service.getPublicUrl(user.avatar.key);
    }

    return PublicUserProfileDto.from({
      email: user.email,
      name:  user.name,
      profileImageUrl,
    });
  }
}
