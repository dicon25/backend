import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity, ApiProperty } from '@nestjs/swagger';
import { CrawlerAuthGuard } from '@/common/guards';
import { PrismaService } from '@/common/modules/prisma';
import { IsString, IsNotEmpty, IsEnum, IsOptional, IsNumber } from 'class-validator';
import { ApiResponseType } from '@/common/lib/swagger/decorators';
import { Public } from '@/modules/user/presentation/decorators';
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
  @ApiOperation({
    summary: 'Create paper relation (crawler/AI server only)',
    description: '크롤러/AI 서버 전용 엔드포인트로, 논문 간의 관계를 생성합니다. 관계 유형은 SIMILAR(유사), OPPOSING(반대), EXTENSION(확장), CITATION(인용), RELATED_TOPIC(관련 주제) 중 하나를 선택할 수 있으며, 유사도 점수와 설명을 선택적으로 제공할 수 있습니다. 크롤러 인증이 필요합니다.',
  })
  @ApiSecurity('bearer')
  @Public()
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
  @ApiOperation({
    summary: 'Get all related papers',
    description: '특정 논문과 관련된 모든 논문 목록을 조회합니다. 모든 관계 유형(SIMILAR, OPPOSING, EXTENSION, CITATION, RELATED_TOPIC)을 포함하며, 유사도 점수 기준으로 내림차순 정렬됩니다. limit 파라미터로 반환할 항목 수를 제한할 수 있습니다(기본값: 20).',
  })
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
  @ApiOperation({
    summary: 'Get similar papers',
    description: '특정 논문과 유사한 논문 목록을 조회합니다. 관계 유형이 SIMILAR인 논문만 반환하며, 유사도 점수 기준으로 내림차순 정렬됩니다. limit 파라미터로 반환할 항목 수를 제한할 수 있습니다(기본값: 20).',
  })
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
  @ApiOperation({
    summary: 'Get opposing papers',
    description: '특정 논문과 반대되는 논문 목록을 조회합니다. 관계 유형이 OPPOSING인 논문만 반환하며, 생성일 기준으로 내림차순 정렬됩니다. limit 파라미터로 반환할 항목 수를 제한할 수 있습니다(기본값: 20).',
  })
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



