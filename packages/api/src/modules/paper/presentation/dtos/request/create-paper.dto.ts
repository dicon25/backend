import { ApiProperty } from '@nestjs/swagger';
import { Prisma } from '@scholub/database';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreatePaperDto {
  @ApiProperty({ description: 'Paper ID' })
  @IsString()
  @IsNotEmpty()
  paperId: string;

  @ApiProperty({ description: 'Paper title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Paper categories', type: [String],
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value.split(',').map((item: string) => item.trim());
      }
    }

    return Array.isArray(value) ? value : [value];
  })
  @IsArray()
  @IsString({ each: true })
  categories: string[];

  @ApiProperty({
    description: 'Paper authors', type: [String],
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value.split(',').map((item: string) => item.trim());
      }
    }

    return Array.isArray(value) ? value : [value];
  })
  @IsArray()
  @IsString({ each: true })
  authors: string[];

  @ApiProperty({ description: 'Paper summary' })
  @IsString()
  @IsNotEmpty()
  summary: string;

  @ApiProperty({
    description: 'Translated summary', required: false,
  })
  @IsOptional()
  @IsString()
  translatedSummary?: string;

  @ApiProperty({ description: 'Paper content (JSON)' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }

    return value;
  })
  @IsNotEmpty()
  content: Prisma.JsonValue;

  @ApiProperty({ description: 'DOI' })
  @IsString()
  @IsNotEmpty()
  doi: string;

  @ApiProperty({
    description: 'PDF Asset ID (optional if pdf file is uploaded)', required: false,
  })
  @IsOptional()
  @IsString()
  pdfId?: string;

  @ApiProperty({
    description: 'Paper URL', required: false,
  })
  @IsOptional()
  @IsString()
  url?: string;

  @ApiProperty({
    description: 'PDF URL', required: false,
  })
  @IsOptional()
  @IsString()
  pdfUrl?: string;

  @ApiProperty({
    description: 'Issued date', required: false,
  })
  @IsOptional()
  @IsDateString()
  issuedAt?: string;

  @ApiProperty({
    description: 'Thumbnail Asset ID', required: false,
  })
  @IsOptional()
  @IsString()
  thumbnailId?: string;

  @ApiProperty({
    description: 'Hashtags (not exposed in API responses)', type: [String], required: false,
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
  hashtags?: string[];

  @ApiProperty({
    description: 'Translated hashtags (Korean)', type: [String], required: false,
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
  translatedHashtags?: string[];

  @ApiProperty({
    description: 'User IDs who should receive this paper as recommendation', type: [String], required: false,
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
  interestedUserIds?: string[];
}

