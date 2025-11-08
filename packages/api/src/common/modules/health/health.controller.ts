import { RedisHealthIndicator } from '@liaoliaots/nestjs-redis-health';
import { Controller, Get } from '@nestjs/common';
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
