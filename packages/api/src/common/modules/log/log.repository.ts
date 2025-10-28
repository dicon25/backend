import { PrismaService } from '@/common/modules/prisma';
import { Injectable } from '@nestjs/common';
import type { Prisma } from '@scholub/database';
import { CreateLogDto } from './dto/create-log.dto';

@Injectable()
export class LogRepository {
  constructor(private readonly prisma: PrismaService) {
  }

  async create(data: CreateLogDto) {
    return this.prisma.log.create({ data: {
      ...data,
      context: data.context as Prisma.InputJsonValue,
    } });
  }

  async findMany(where?: Prisma.LogWhereInput, take = 100, skip = 0) {
    return this.prisma.log.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    });
  }

  async findByRequestId(requestId: string) {
    return this.prisma.log.findMany({
      where:   { requestId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async deleteOldLogs(daysOld: number) {
    const cutoffDate = new Date;

    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return this.prisma.log.deleteMany({ where: { createdAt: { lt: cutoffDate } } });
  }

  async count(where?: Prisma.LogWhereInput) {
    return this.prisma.log.count({ where });
  }
}
