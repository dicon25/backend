import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ReactionType } from '../../../domain/entities';

export class ToggleReactionDto {
  @ApiProperty({ enum: ReactionType, description: 'Reaction type' })
  @IsEnum(ReactionType)
  type: ReactionType;
}



