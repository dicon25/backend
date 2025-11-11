import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
} from 'class-validator';

// Request DTOs
export class CreateDiscussionDto {
  @ApiProperty({ description: 'Discussion title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Discussion content' })
  @IsString()
  @IsNotEmpty()
  content: string;
}

export class CreateMessageDto {
  @ApiProperty({ description: 'Message content' })
  @IsString()
  @IsNotEmpty()
  content: string;
}

export class UpdateMessageDto {
  @ApiProperty({ description: 'Updated message content' })
  @IsString()
  @IsNotEmpty()
  content: string;
}

// Response DTOs
export class DiscussionDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  paperId: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  creatorId: string;

  @ApiProperty()
  participantCount: number;

  @ApiProperty()
  messageCount: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class DiscussionMessageDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  discussionId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  isEdited: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

