import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity, ApiProperty } from '@nestjs/swagger';
import { CrawlerAuthGuard } from '@/common/guards';
import { PrismaService } from '@/common/modules/prisma';
import { IsString, IsNotEmpty, IsEnum, IsOptional, IsNumber } from 'class-validator';
import { ApiResponseType } from '@/common/lib/swagger/decorators';
import { Type } from 'class-transformer';

// DTOs
class CreateRelationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  relatedPaperId: string;

  @ApiProperty({ enum: ['SIMILAR', 'OPPOSING', 'EXTENSION', 'CITATION', 'RELATED_TOPIC'] })
  @IsEnum(['SIMILAR', 'OPPOSING', 'EXTENSION', 'CITATION', 'RELATED_TOPIC'])
  type: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  similarityScore?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;
}

class ListRelatedDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 20;
}

@ApiTags('Paper Relations')
@Controller()
export class PaperRelationController {
  constructor(private readonly prisma: PrismaService) {}

  // Crawler/AI Server endpoint
  @Post('crawler/papers/:paperId/relations')
  @ApiOperation({ summary: 'Create paper relation (crawler/AI server only)' })
  @ApiSecurity('X-Secret-Key')
  @UseGuards(CrawlerAuthGuard)
  async createRelation(@Param('paperId') paperId: string, @Body() dto: CreateRelationDto) {
    const paper = await this.prisma.paper.findUnique({ where: { paperId } });
    if (!paper) {
      throw new Error('Paper not found');
    }

    return await this.prisma.paperRelation.create({
      data: {
        sourcePaperId: paper.id,
        relatedPaperId: dto.relatedPaperId,
        type: dto.type as any,
        similarityScore: dto.similarityScore,
        description: dto.description,
      },
    });
  }

  // Public endpoints
  @Get('papers/:paperId/related')
  @ApiOperation({ summary: 'Get all related papers' })
  async getRelatedPapers(@Param('paperId') paperId: string, @Query() query: ListRelatedDto) {
    const paper = await this.prisma.paper.findUnique({ where: { paperId } });
    if (!paper) {
      throw new Error('Paper not found');
    }

    const relations = await this.prisma.paperRelation.findMany({
      where: { sourcePaperId: paper.id },
      take: query.limit,
      include: {
        relatedPaper: true,
      },
      orderBy: { similarityScore: 'desc' },
    });

    return relations;
  }

  @Get('papers/:paperId/similar')
  @ApiOperation({ summary: 'Get similar papers' })
  async getSimilarPapers(@Param('paperId') paperId: string, @Query() query: ListRelatedDto) {
    const paper = await this.prisma.paper.findUnique({ where: { paperId } });
    if (!paper) {
      throw new Error('Paper not found');
    }

    const relations = await this.prisma.paperRelation.findMany({
      where: {
        sourcePaperId: paper.id,
        type: 'SIMILAR',
      },
      take: query.limit,
      include: {
        relatedPaper: true,
      },
      orderBy: { similarityScore: 'desc' },
    });

    return relations;
  }

  @Get('papers/:paperId/opposing')
  @ApiOperation({ summary: 'Get opposing papers' })
  async getOpposingPapers(@Param('paperId') paperId: string, @Query() query: ListRelatedDto) {
    const paper = await this.prisma.paper.findUnique({ where: { paperId } });
    if (!paper) {
      throw new Error('Paper not found');
    }

    const relations = await this.prisma.paperRelation.findMany({
      where: {
        sourcePaperId: paper.id,
        type: 'OPPOSING',
      },
      take: query.limit,
      include: {
        relatedPaper: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return relations;
  }
}



