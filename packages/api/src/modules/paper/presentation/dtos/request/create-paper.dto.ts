import { IsString, IsArray, IsOptional, IsDateString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaperDto {
  @ApiProperty({ description: 'Paper ID' })
  @IsString()
  @IsNotEmpty()
  paperId: string;

  @ApiProperty({ description: 'Paper title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Paper categories', type: [String] })
  @IsArray()
  @IsString({ each: true })
  categories: string[];

  @ApiProperty({ description: 'Paper authors', type: [String] })
  @IsArray()
  @IsString({ each: true })
  authors: string[];

  @ApiProperty({ description: 'Paper summary' })
  @IsString()
  @IsNotEmpty()
  summary: string;

  @ApiProperty({ description: 'Paper content (JSON)' })
  @IsNotEmpty()
  content: any;

  @ApiProperty({ description: 'DOI' })
  @IsString()
  @IsNotEmpty()
  doi: string;

  @ApiProperty({ description: 'PDF Asset ID (optional if pdf file is uploaded)', required: false })
  @IsOptional()
  @IsString()
  pdfId?: string;

  @ApiProperty({ description: 'Paper URL', required: false })
  @IsOptional()
  @IsString()
  url?: string;

  @ApiProperty({ description: 'PDF URL', required: false })
  @IsOptional()
  @IsString()
  pdfUrl?: string;

  @ApiProperty({ description: 'Issued date', required: false })
  @IsOptional()
  @IsDateString()
  issuedAt?: string;

  @ApiProperty({ description: 'Thumbnail Asset ID', required: false })
  @IsOptional()
  @IsString()
  thumbnailId?: string;
}



