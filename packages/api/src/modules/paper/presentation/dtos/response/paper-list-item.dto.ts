import { ApiProperty } from '@nestjs/swagger';
import { MyReactionDto } from './paper-detail.dto';

export class PaperListItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  paperId: string;

  @ApiProperty({ type: [String] })
  categories: string[];

  @ApiProperty()
  title: string;

  @ApiProperty()
  summary: string;

  @ApiProperty()
  likeCount: number;

  @ApiProperty()
  unlikeCount: number;

  @ApiProperty()
  discussionCount: number;

  @ApiProperty({ required: false })
  thumbnailUrl?: string;

  @ApiProperty({
    type:     MyReactionDto,
    required: false,
  })
  myReaction?: MyReactionDto;
}

