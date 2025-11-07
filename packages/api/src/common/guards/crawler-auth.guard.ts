import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

/**
 * 크롤러 인증 Guard
 * 크롤러 전용 엔드포인트를 보호합니다.
 * 요청 헤더의 X-Secret-Key가 CRAWLER_SECRET_KEY와 일치하는지 검증합니다.
 */
@Injectable()
export class CrawlerAuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const secretKey = request.headers['x-secret-key'];
    const crawlerSecretKey = this.configService.get<string>('CRAWLER_SECRET_KEY');

    if (!secretKey || secretKey !== crawlerSecretKey) {
      throw new UnauthorizedException('Invalid crawler secret key');
    }

    return true;
  }
}



