import { ApiResponseType } from '@common/lib/swagger/decorators';
import { UserDetailQuery, UserDetailResult } from '@modules/user/application/queries';
import { UpdateProfileCommand, UpdateProfileResult } from '@modules/user/application/commands';
import { UserEntity } from '@modules/user/domain/entities';
import { CurrentUser } from '@modules/user/presentation/decorators';
import { Controller, Get, Patch, Body, UseInterceptors, UploadedFile, Logger } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { QueryBus, CommandBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { UserDetailResponseDto } from '../dtos/response/user-detail.dto';
import { UpdateProfileDto } from '../dtos/request/update-profile.dto';
import { getMulterS3Uploader } from '@/common/modules/s3/s3.config';

@ApiTags('User')
@Controller('users')
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {
  }

  @Get('me')
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
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    maxSize: 5 * 1024 * 1024, // 5MB
  })))
  @ApiOperation({ summary: 'Update user profile (name and/or profile picture)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          example: 'John Doe',
          description: 'User name (optional)',
        },
        profilePicture: {
          type: 'string',
          format: 'binary',
          description: 'Profile picture image file (optional)',
        },
      },
    },
  })
  @ApiResponseType({
    type:        UserDetailResponseDto,
    description: 'Profile updated successfully',
    errors:      [400, 401, 404, 500],
  })
  async updateProfile(
    @CurrentUser() user: UserEntity,
    @Body() dto: UpdateProfileDto,
    @UploadedFile() profilePicture?: Express.Multer.File,
  ): Promise<UserDetailResponseDto> {
    const command = new UpdateProfileCommand(user.id, dto.name, profilePicture);
    const result = await this.commandBus.execute<UpdateProfileCommand, UpdateProfileResult>(command);

    // Get updated user detail with profile image URL
    const query = UserDetailQuery.from({ id: result.user.id });
    const detailResult = await this.queryBus.execute<UserDetailQuery, UserDetailResult>(query);

    return UserDetailResponseDto.from(detailResult);
  }
}
