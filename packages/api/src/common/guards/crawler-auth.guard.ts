import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class CrawlerAuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);
    const crawlerSecretKey = this.configService.get<string>('CRAWLER_SECRET_KEY');

    if (!crawlerSecretKey) {
      throw new UnauthorizedException('CRAWLER_SECRET_KEY is not configured');
    }

    if (!token || token !== crawlerSecretKey) {
      throw new UnauthorizedException('Invalid crawler secret key');
    }

    return true;
  }
}

