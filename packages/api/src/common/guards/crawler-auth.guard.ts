import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class CrawlerAuthGuard implements CanActivate {
  private readonly logger = new Logger(CrawlerAuthGuard.name);

  constructor(private readonly configService: ConfigService) {
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      this.logger.warn('Missing or invalid authorization header', {
        hasHeader:   !!authHeader,
        headerValue: authHeader ? `${authHeader.substring(0, 20)}...` : null,
      });

      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);
    const crawlerSecretKey = this.configService.get<string>('CRAWLER_SECRET_KEY');

    if (!crawlerSecretKey) {
      this.logger.error('CRAWLER_SECRET_KEY is not configured');

      throw new UnauthorizedException('CRAWLER_SECRET_KEY is not configured');
    }

    // Debug logging (only log lengths and first few chars for security)
    if (token !== crawlerSecretKey) {
      this.logger.warn('Invalid crawler secret key', {
        tokenLength:    token.length,
        expectedLength: crawlerSecretKey.length,
        tokenPrefix:    token.substring(0, 10),
        expectedPrefix: crawlerSecretKey.substring(0, 10),
      });

      throw new UnauthorizedException('Invalid crawler secret key');
    }

    return true;
  }
}

