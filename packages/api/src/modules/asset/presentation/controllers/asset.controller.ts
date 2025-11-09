import { CheckAssetExistsQuery, CheckAssetExistsResult } from '@modules/asset/application/queries';
import { Controller, Get, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Assets')
@Controller('assets')
export class AssetController {
  constructor(private readonly queryBus: QueryBus) {
  }

  @Get('/exists')
  @ApiOperation({
    summary: 'Check if asset exists',
    description: '에셋 키를 사용하여 특정 에셋이 존재하는지 확인합니다. 에셋 키를 쿼리 파라미터로 전달하면 해당 에셋의 존재 여부를 반환합니다. 크롤러에서 기존 에셋 ID를 재사용하기 전에 유효성을 검증하는 데 사용됩니다.',
  })
  async checkAssetExists(@Query('key') key: string): Promise<CheckAssetExistsResult> {
    const query = CheckAssetExistsQuery.from({ key });
    const result = await this.queryBus.execute<CheckAssetExistsQuery, CheckAssetExistsResult>(query);

    return result;
  }
}
