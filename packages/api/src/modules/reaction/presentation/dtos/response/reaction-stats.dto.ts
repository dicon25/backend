import { ApiProperty } from '@nestjs/swagger';

export class ReactionStatsDto {
  @ApiProperty({ description: 'Number of likes' })
  likeCount: number;

  @ApiProperty({ description: 'Number of unlikes' })
  unlikeCount: number;
}



