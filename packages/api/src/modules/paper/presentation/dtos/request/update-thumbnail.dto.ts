import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateThumbnailDto {
  @ApiProperty({
    description: 'Thumbnail Asset ID (optional if thumbnail file is uploaded)', required: false,
  })
  @IsOptional()
  @IsString()
  thumbnailId?: string;
}

