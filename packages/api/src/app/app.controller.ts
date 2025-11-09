import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import packageJson from '@/../package.json';
import { Public } from '@/modules/user/presentation/decorators';

@Controller()
@UseInterceptors(CacheInterceptor)
export class AppController {
  @Public()
  @Get('/version')
  @CacheKey('app.version')
  @CacheTTL(60)
  @ApiOperation({
    summary:     'Get application version',
    description: '현재 배포된 애플리케이션의 버전 정보를 반환합니다. package.json의 version 필드를 읽어 반환하며, 60초간 캐시됩니다.',
  })
  getVersion(): string {
    return packageJson.version;
  }
}
