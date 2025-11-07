import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { withAccelerate } from '@prisma/extension-accelerate';
import { Prisma, PrismaClient } from '@scholub/database';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly configService: ConfigService) {
    const logLevel = configService.get<string>('PRISMA_LOG_LEVEL') || 'warn';

    super({
      datasources:        { db: { url: configService.get<string>('DATABASE_URL') } },
      transactionOptions: {
        maxWait: 10000,
        timeout: 10000,
      },
      log:         [logLevel as Prisma.LogLevel],
      errorFormat: 'colorless',
    });

    return this.$extends(withAccelerate()) as this;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
