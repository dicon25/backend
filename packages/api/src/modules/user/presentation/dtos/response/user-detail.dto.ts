import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '@scholub/database';
import { DataClass } from 'dataclasses';

export class UserDetailResponseDto extends DataClass {
  @ApiProperty({
    description: 'The ID of the user',
    example:     '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'The email of the user',
    example:     'test@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'The name of the user',
    example:     'John Doe',
  })
  name: string;

  @ApiProperty({
    description: 'The status of the user',
    example:     'ACTIVE',
    enum:        UserStatus,
  })
  status: UserStatus;

  @ApiPropertyOptional({
    description: 'The profile image URL of the user',
    example:     'https://example.com/avatars/123.jpg',
  })
  profileImageUrl?: string;

  @ApiProperty({
    description: 'The created at of the user',
    example:     '2021-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'The updated at of the user',
    example:     '2021-01-01T00:00:00.000Z',
  })
  updatedAt: Date;
}
