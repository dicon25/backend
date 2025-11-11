import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
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

export class ListDto {
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

export class PaginatedDiscussionsDto {
  @ApiProperty({ type: [DiscussionDto] })
  discussions: DiscussionDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;
}

export class PaginatedMessagesDto {
  @ApiProperty({ type: [DiscussionMessageDto] })
  messages: DiscussionMessageDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;
}

