import { ApiProperty } from '@nestjs/swagger';
import { ReactionType } from '../../../domain/entities';

export class ReactionDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  paperId: string;

  @ApiProperty({ enum: ReactionType })
  type: ReactionType;

  @ApiProperty()
  createdAt: Date;
}



