import { ApiProperty } from '@nestjs/swagger';

export class RecordPaperViewResponseDto {
  @ApiProperty({ description: '성공 여부' })
  success: boolean;

  @ApiProperty({ description: '생성된 PaperView ID' })
  paperViewId: string;
}

