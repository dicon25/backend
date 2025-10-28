# Google OAuth 설정 가이드

Scholub 백엔드는 Google OAuth 2.0을 사용하여 사용자 인증을 처리합니다.

## 🔧 Google Cloud Console 설정

### 1. 프로젝트 생성
1. [Google Cloud Console](https://console.cloud.google.com/)에 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택

### 2. OAuth 동의 화면 구성
1. **API 및 서비스** > **OAuth 동의 화면** 이동
2. **외부** 사용자 유형 선택 (개발 중에는 테스트 사용자만 로그인 가능)
3. 앱 정보 입력:
   - 앱 이름: `Scholub`
   - 사용자 지원 이메일: 본인 이메일
   - 개발자 연락처 정보: 본인 이메일
4. 범위 추가:
   - `./auth/userinfo.email`
   - `./auth/userinfo.profile`
5. 테스트 사용자 추가 (개발 단계)
   - 로그인할 Gmail 계정 추가

### 3. OAuth 클라이언트 ID 생성
1. **API 및 서비스** > **사용자 인증 정보** 이동
2. **사용자 인증 정보 만들기** > **OAuth 클라이언트 ID** 선택
3. 애플리케이션 유형: **웹 애플리케이션**
4. 이름: `Scholub Backend`
5. 승인된 리디렉션 URI 추가:
   ```
   개발: http://localhost:8000/auth/google/callback
   프로덕션: https://api.scholub.com/auth/google/callback
   ```
6. **만들기** 클릭
7. 생성된 **클라이언트 ID**와 **클라이언트 보안 비밀번호** 복사

## 🔐 환경 변수 설정

`.env` 파일에 다음 환경 변수를 추가:

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:8000/auth/google/callback

# Frontend URL (토큰 리디렉션용)
FRONTEND_URL=http://localhost:3000
```

## 📋 데이터베이스 마이그레이션

User 모델이 변경되었으므로 마이그레이션이 필요합니다:

```bash
cd packages/database
pnpm prisma migrate dev --name google_oauth_migration
```

⚠️ **주의**: 기존 사용자 데이터가 있는 경우 마이그레이션 전에 백업하세요!

## 🚀 로컬 개발 테스트

### 1. 백엔드 실행
```bash
pnpm dev
```

### 2. Google 로그인 시작
브라우저에서 다음 URL 접속:
```
http://localhost:8000/auth/google
```

### 3. 로그인 플로우
1. Google 계정 선택 화면 표시
2. Scholub 앱 권한 승인
3. 백엔드 콜백 처리
4. 프론트엔드로 리디렉션 (토큰 포함)

### 4. 리디렉션 URL 형식
```
http://localhost:3000/auth/callback?accessToken=xxx&refreshToken=yyy
```

프론트엔드에서 이 토큰을 받아 로컬 스토리지에 저장하고 사용합니다.

## 🔄 API 엔드포인트

### Google 로그인 시작
```http
GET /auth/google
```
- 사용자를 Google OAuth 동의 화면으로 리디렉션

### Google 콜백 (자동 호출)
```http
GET /auth/google/callback
```
- Google에서 인증 후 자동으로 호출
- JWT 토큰 생성 후 프론트엔드로 리디렉션

### 로그아웃
```http
POST /auth/logout
Authorization: Bearer <access_token>

{
  "refreshToken": "string"
}
```

### 토큰 갱신
```http
POST /auth/refresh

{
  "refreshToken": "string"
}
```

### 사용자 정보 조회
```http
GET /users/me
Authorization: Bearer <access_token>
```

## 🎯 프론트엔드 연동

### 로그인 버튼
```typescript
// React 예시
function LoginButton() {
  const handleLogin = () => {
    window.location.href = 'http://localhost:8000/auth/google';
  };

  return <button onClick={handleLogin}>Google로 로그인</button>;
}
```

### 콜백 처리
```typescript
// /auth/callback 페이지
function AuthCallback() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');

    if (accessToken && refreshToken) {
      // 토큰 저장
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      // 홈으로 리디렉션
      window.location.href = '/';
    }
  }, []);

  return <div>로그인 중...</div>;
}
```

### API 요청 시 토큰 사용
```typescript
// Axios 예시
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000',
});

// 요청 인터셉터에서 토큰 추가
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 응답 인터셉터에서 401 처리 및 토큰 갱신
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem('refreshToken');
      
      try {
        const { data } = await axios.post(
          'http://localhost:8000/auth/refresh',
          { refreshToken }
        );
        
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        
        // 원래 요청 재시도
        error.config.headers.Authorization = `Bearer ${data.accessToken}`;
        return axios.request(error.config);
      } catch (refreshError) {
        // 리프레시 실패 시 로그인 페이지로
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
```

## 🔒 보안 고려사항

### 1. HTTPS 사용 (프로덕션)
프로덕션 환경에서는 반드시 HTTPS를 사용해야 합니다:
```bash
GOOGLE_CALLBACK_URL=https://api.scholub.com/auth/google/callback
FRONTEND_URL=https://scholub.com
```

### 2. 환경 변수 보호
- `.env` 파일을 `.gitignore`에 추가
- 프로덕션 환경 변수는 안전한 곳에 저장 (AWS Secrets Manager, etc.)

### 3. CORS 설정
```bash
CORS_ORIGIN=https://scholub.com
```

### 4. JWT Secret
32자 이상의 강력한 랜덤 문자열 사용:
```bash
# 생성 예시
openssl rand -base64 32
```

## 🐛 트러블슈팅

### "리디렉션 URI 불일치" 오류
- Google Cloud Console의 승인된 리디렉션 URI와 `GOOGLE_CALLBACK_URL`이 정확히 일치하는지 확인
- 프로토콜(http/https), 포트, 경로가 모두 일치해야 함

### "이 앱은 확인되지 않았습니다" 경고
- 개발 단계에서는 정상입니다
- "고급" > "Scholub(으)로 이동(안전하지 않음)" 클릭하여 계속 진행
- 프로덕션 배포 시 Google 앱 확인 절차 필요

### 토큰이 프론트엔드로 전달되지 않음
- `FRONTEND_URL` 환경 변수 확인
- 브라우저 개발자 도구에서 네트워크 탭 확인
- 리디렉션 URL 로그 확인

### 401 Unauthorized 오류
- Access Token이 만료되었을 수 있음 (기본 15분)
- Refresh Token으로 새 Access Token 발급
- JWT_SECRET이 백엔드에서 일관되게 설정되어 있는지 확인

## 📚 추가 자료

- [Google OAuth 2.0 문서](https://developers.google.com/identity/protocols/oauth2)
- [Passport.js Google Strategy](http://www.passportjs.org/packages/passport-google-oauth20/)
- [NestJS Passport Integration](https://docs.nestjs.com/security/authentication)

## 💡 팁

### 여러 환경 관리
```bash
# .env.local
GOOGLE_CALLBACK_URL=http://localhost:8000/auth/google/callback
FRONTEND_URL=http://localhost:3000

# .env.production
GOOGLE_CALLBACK_URL=https://api.scholub.com/auth/google/callback
FRONTEND_URL=https://scholub.com
```

### 테스트 사용자 추가
개발 단계에서는 OAuth 동의 화면에서 테스트 사용자를 추가해야 합니다.
최대 100명까지 추가 가능합니다.

---

문제가 발생하면 이슈를 생성하거나 팀에 문의하세요!

