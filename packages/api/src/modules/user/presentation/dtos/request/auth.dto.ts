import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'password123', minLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: '관심있는 분야 목록 (선택사항)',
    type:        [String],
    required:    false,
    example:     ['Machine Learning', 'Computer Vision'],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value.split(',').map((item: string) => item.trim())
          .filter(Boolean);
      }
    }

    return Array.isArray(value) ? value : [];
  })
  @IsArray()
  @IsString({ each: true })
  interestedCategories?: string[];

  @ApiProperty({
    description: 'Profile picture image file (optional)',
    type:        'string',
    format:      'binary',
    required:    false,
  })
  @IsOptional()
  profilePicture?: Express.Multer.File;
}

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

