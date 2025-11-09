import { ApiProperty } from '@nestjs/swagger';
import { PaperDetailDto } from './paper-detail.dto';

export class PaperListDto {
  @ApiProperty({ type: [PaperDetailDto] })
  papers: PaperDetailDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

