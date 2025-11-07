import { ApiProperty } from '@nestjs/swagger';
import { ReactionDto } from './reaction.dto';

export class UserReactionsDto {
  @ApiProperty({ type: [ReactionDto] })
  reactions: ReactionDto[];

  @ApiProperty()
  total: number;
}



