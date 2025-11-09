import { RedisHealthIndicator } from '@liaoliaots/nestjs-redis-health';
import { Controller, Get } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicatorResult,
  HttpHealthIndicator,
} from '@nestjs/terminus';
import Redis from 'ioredis';
import { PrismaService } from '@/common/modules/prisma/prisma.service';
import { Public } from '@/modules/user/presentation/decorators';

@Controller()
export class HealthController {
  private readonly redis: Redis;
  constructor(private healthIndicator: HealthCheckService,
    private httpIndicator: HttpHealthIndicator,
    private redisIndicator: RedisHealthIndicator,
    private readonly prismaService: PrismaService) {
    this.redis = new Redis(process.env.REDIS_URL ?? '');
  }

  private async checkPrisma(): Promise<HealthIndicatorResult> {
    try {
      await this.prismaService.$queryRaw`SELECT 1`;

      return { postgres: { status: 'up' } };
    } catch (error) {
      return { postgres: {
        status:  'down',
        message: error instanceof Error ? error.message : 'Unknown error',
      } };
    }
  }

  @Public()
  @Get('health')
  @HealthCheck()
  @ApiOperation({
    summary:     'Health check',
    description: '시스템의 전반적인 상태를 확인하는 엔드포인트입니다. Google 연결 상태(외부 네트워크), PostgreSQL 데이터베이스 연결 상태, Redis 캐시 서버 연결 상태를 체크하여 각 서비스의 상태(up/down)를 반환합니다.',
  })
  check() {
    return this.healthIndicator.check([
      () => this.httpIndicator.pingCheck('google', 'https://google.com'),
      () => this.checkPrisma(),
      () => this.redisIndicator.checkHealth('redis', {
        type:   'redis',
        client: this.redis,
      }),
    ]);
  }
}
