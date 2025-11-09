import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PaperSortBy, SortOrder } from '@/modules/paper/domain/enums';

export class ListPapersDto {
  @ApiProperty({
    description: 'Page number', default: 1, required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Items per page', default: 20, required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;

  @ApiProperty({
    enum: PaperSortBy, default: PaperSortBy.CREATED_AT, required: false,
  })
  @IsOptional()
  @IsEnum(PaperSortBy)
  sortBy?: PaperSortBy = PaperSortBy.CREATED_AT;

  @ApiProperty({
    enum: SortOrder, default: SortOrder.DESC, required: false,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;

  @ApiProperty({
    description: 'Filter by categories', type: [String], required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @ApiProperty({
    description: 'Filter by authors', type: [String], required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  authors?: string[];

  @ApiProperty({
    description: 'Filter by year', required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  year?: number;

  @ApiProperty({
    description: 'Search query', required: false,
  })
  @IsOptional()
  @IsString()
  searchQuery?: string;
}

