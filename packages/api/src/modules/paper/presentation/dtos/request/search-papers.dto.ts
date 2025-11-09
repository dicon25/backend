import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class SearchPapersDto {
  @ApiProperty({
    description: 'Search query', required: false,
  })
  @IsOptional()
  @IsString()
  query?: string;
}

