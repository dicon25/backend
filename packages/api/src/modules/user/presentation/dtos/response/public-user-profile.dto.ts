import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DataClass } from 'dataclasses';

export class PublicUserProfileDto extends DataClass {
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

  @ApiPropertyOptional({
    description: 'The profile image URL of the user',
    example:     'https://example.com/avatars/123.jpg',
  })
  profileImageUrl?: string;
}

