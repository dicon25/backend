import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, PrismaClient } from '@scholub/database';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly configService: ConfigService) {
    super({
      datasources:        { db: { url: configService.get<string>('DATABASE_URL') } },
      transactionOptions: {
        maxWait: 10000,
        timeout: 10000,
      },
      log:         [configService.get<string>('PRISMA_LOG_LEVEL') as Prisma.LogLevel],
      errorFormat: 'colorless',
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
