import { IS_PUBLIC_KEY } from '@modules/user/presentation/decorators';
import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      // Public 엔드포인트에서도 JWT 토큰이 있으면 파싱 시도 (선택적 인증)
      // 실패해도 계속 진행
      return Promise.resolve(super.canActivate(context) as Promise<boolean>)
        .then(() => true)
        .catch(() => true);
    }

    return super.canActivate(context);
  }
}

