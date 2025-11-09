import { ApiProperty } from '@nestjs/swagger';

export class MyReactionDto {
  @ApiProperty({ description: 'Has user liked this paper' })
  isLiked: boolean;

  @ApiProperty({ description: 'Has user unliked this paper' })
  isUnliked: boolean;
}

export class PaperDetailDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  paperId: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ type: [String] })
  categories: string[];

  @ApiProperty({ type: [String] })
  authors: string[];

  @ApiProperty()
  summary: string;

  @ApiProperty()
  content: any;

  @ApiProperty()
  doi: string;

  @ApiProperty({ required: false })
  url?: string;

  @ApiProperty({ required: false })
  pdfUrl?: string;

  @ApiProperty({ required: false })
  issuedAt?: Date;

  @ApiProperty()
  likeCount: number;

  @ApiProperty()
  unlikeCount: number;

  @ApiProperty()
  totalViewCount: number;

  @ApiProperty({ required: false })
  thumbnailUrl?: string;

  @ApiProperty()
  pdfId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({
    type: MyReactionDto, required: false,
  })
  myReaction?: MyReactionDto;
}

