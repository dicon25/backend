import type { PrismaService } from '@/common/modules/prisma';
import type { LogLevel, Prisma } from '@scholub/database';
import TransportStream from 'winston-transport';

type LogTransportOptions = TransportStream.TransportStreamOptions & {
  prisma: PrismaService;
};

interface LogInfo {
  level:         string;
  message:       string;
  context?:      string;
  stack?:        string;
  userId?:       string;
  requestId?:    string;
  ip?:           string;
  userAgent?:    string;
  [key: string]: unknown;
}

export class LogTransport extends TransportStream {
  private readonly prisma: PrismaService;

  constructor(opts: LogTransportOptions) {
    super(opts);

    this.prisma = opts.prisma;
  }

  async log(info: LogInfo, callback: () => void) {
    setImmediate(() => this.emit('logged', info));

    const {
      level,
      message,
      context,
      stack,
      userId,
      requestId,
      ip,
      userAgent,
      ...additionalContext
    } = info;

    try {
      const mappedLevel = this.mapLevel(level);

      await this.prisma.log.create({ data: {
        level:      mappedLevel,
        service:    context || 'UnknownService',
        message:    message.substring(0, 500),
        stackTrace: stack,
        context:    Object.keys(additionalContext).length > 0
          ? (additionalContext as Prisma.InputJsonValue)
          : undefined,
        userId,
        requestId,
        ip,
        userAgent,
      } });
    } catch (err) {
      console.error('DB Logging Failed:', err);
    }

    callback();
  }

  private mapLevel(level: string): LogLevel {
    switch ((level || '').toLowerCase()) {
      case 'error':
        return 'ERROR';

      case 'warn':

      case 'warning':
        return 'WARN';

      case 'debug':

      case 'verbose':

      case 'silly':
        return 'DEBUG';

      case 'info':

      default:
        return 'INFO';
    }
  }
}
