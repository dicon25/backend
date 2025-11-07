import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

/**
 * AI 서버 인증 Guard
 * AI 서버 데이터 수집 API를 보호합니다.
 * 요청 헤더의 X-Secret-Key가 AI_SERVER_SECRET_KEY와 일치하는지 검증합니다.
 */
@Injectable()
export class AiServerAuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const secretKey = request.headers['x-secret-key'];
    const aiServerSecretKey = this.configService.get<string>('AI_SERVER_SECRET_KEY');

    if (!secretKey || secretKey !== aiServerSecretKey) {
      throw new UnauthorizedException('Invalid AI server secret key');
    }

    return true;
  }
}



