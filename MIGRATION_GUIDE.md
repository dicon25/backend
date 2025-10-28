# Google OAuth 마이그레이션 가이드

## 📋 변경 사항 요약

Scholub 백엔드의 인증 시스템이 이메일/비밀번호 방식에서 Google OAuth 2.0으로 변경되었습니다.

### 데이터베이스 변경
- ❌ `User.password` 필드 제거
- ✅ `User.provider` 필드 추가 (AuthProvider enum)
- ✅ `User.providerId` 필드 추가 (Google User ID)
- ✅ `User.name` 필드 추가 (optional)
- ✅ `User.bio` 필드 추가 (optional)

### API 변경
- ❌ `POST /auth/login` (이메일/비밀번호) 제거
- ✅ `GET /auth/google` (Google 로그인 시작) 추가
- ✅ `GET /auth/google/callback` (Google 콜백) 추가
- ✅ `POST /auth/logout` 유지
- ✅ `POST /auth/refresh` 유지

## 🚀 마이그레이션 단계

### 1. 환경 변수 설정

`.env` 파일에 Google OAuth 설정 추가:

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:8000/auth/google/callback

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

Google OAuth 설정 방법은 [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md) 참조

### 2. 의존성 설치

```bash
cd packages/api
pnpm install
```

새로운 패키지:
- `passport-google-oauth20`
- `@types/passport-google-oauth20`

### 3. 데이터베이스 마이그레이션

⚠️ **주의**: 이 마이그레이션은 `password` 컬럼을 삭제합니다!

#### 개발 환경 (데이터 손실 OK)
```bash
cd packages/database

# 기존 데이터베이스 초기화
pnpm prisma migrate reset

# 새 마이그레이션 적용
pnpm prisma migrate dev --name google_oauth_migration

# 시드 데이터 생성
pnpm prisma db seed
```

#### 프로덕션 환경 (기존 사용자 데이터 보존)

```bash
cd packages/database

# 1. 백업
pg_dump $DATABASE_URL > backup.sql

# 2. 마이그레이션 생성 (적용하지 않음)
pnpm prisma migrate dev --name google_oauth_migration --create-only

# 3. 생성된 마이그레이션 파일 수정
# packages/database/prisma/migrations/[timestamp]_google_oauth_migration/migration.sql

# 기존 사용자 데이터 처리 로직 추가:
# - password 컬럼을 providerId로 복사 (또는 기본값 설정)
# - provider를 'GOOGLE'로 설정
# 예시:

# -- 기존 사용자에게 임시 providerId 할당 (이메일 기반)
# UPDATE "User" SET 
#   "providerId" = 'migrated_' || "id",
#   "provider" = 'GOOGLE'
# WHERE "password" IS NOT NULL;

# -- password 컬럼 삭제
# ALTER TABLE "User" DROP COLUMN "password";

# -- 나머지 컬럼 추가
# ALTER TABLE "User" ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'GOOGLE';
# ALTER TABLE "User" ADD COLUMN "providerId" TEXT NOT NULL;
# ALTER TABLE "User" ADD COLUMN "name" TEXT;
# ALTER TABLE "User" ADD COLUMN "bio" TEXT;

# 4. 마이그레이션 적용
pnpm prisma migrate deploy

# 5. 검증
pnpm prisma studio
```

**중요**: 프로덕션 환경에서는 기존 사용자들이 Google 계정으로 다시 로그인해야 합니다.
이메일이 동일하면 자동으로 계정이 연결됩니다.

### 4. Prisma Client 재생성

```bash
cd packages/database
pnpm prisma generate
```

### 5. 백엔드 실행

```bash
cd packages/api
pnpm dev
```

### 6. 테스트

브라우저에서 Google 로그인 테스트:
```
http://localhost:8000/auth/google
```

## 🔄 롤백 (비상시)

마이그레이션에 문제가 있는 경우:

```bash
# 1. 백업 복원
psql $DATABASE_URL < backup.sql

# 2. 이전 커밋으로 복귀
git revert HEAD

# 3. 의존성 재설치
pnpm install

# 4. 이전 Prisma Client 생성
cd packages/database
pnpm prisma generate
```

## 📊 데이터 마이그레이션 전략

### Option 1: 완전 초기화 (개발 환경 권장)
- 기존 데이터 모두 삭제
- 새로운 스키마로 시작
- 시드 데이터로 테스트 사용자 생성

### Option 2: 점진적 마이그레이션 (프로덕션 권장)
1. 새 컬럼 추가 (nullable)
2. 기존 사용자 데이터를 새 형식으로 변환
3. 이메일 기반으로 Google 로그인 시 기존 계정 연결
4. 일정 기간 후 password 컬럼 삭제

### Option 3: 이중 인증 지원 (최대 호환성)
- Google OAuth와 이메일/비밀번호 둘 다 지원
- 사용자가 점진적으로 Google 계정 연결
- 복잡하지만 가장 안전함

## 🧪 테스트 체크리스트

- [ ] Google 로그인 시작 (`/auth/google`)
- [ ] Google 콜백 처리 (`/auth/google/callback`)
- [ ] JWT 토큰 발급 확인
- [ ] 새 사용자 자동 생성 확인
- [ ] 기존 사용자 정보 업데이트 확인
- [ ] 로그아웃 기능 (`/auth/logout`)
- [ ] 토큰 갱신 기능 (`/auth/refresh`)
- [ ] 보호된 엔드포인트 접근 (`/users/me`)
- [ ] 프론트엔드 리디렉션 확인

## 🐛 알려진 이슈 및 해결방법

### Issue 1: "redirect_uri_mismatch" 오류
**원인**: Google Cloud Console의 리디렉션 URI와 불일치

**해결**:
```bash
# .env 확인
GOOGLE_CALLBACK_URL=http://localhost:8000/auth/google/callback

# Google Cloud Console에서 동일한 URI 등록 확인
```

### Issue 2: Prisma Client 타입 오류
**원인**: 스키마 변경 후 Client 재생성 안 됨

**해결**:
```bash
cd packages/database
pnpm prisma generate
```

### Issue 3: 기존 사용자 로그인 불가
**원인**: providerId가 없는 기존 사용자

**해결**:
- 새로운 Google 계정으로 로그인하여 신규 사용자로 등록
- 또는 데이터베이스에서 수동으로 providerId 추가

## 📚 관련 문서

- [Google OAuth 설정 가이드](./GOOGLE_OAUTH_SETUP.md)
- [데이터베이스 설계](./packages/database/DATABASE_DESIGN.md)
- [API 구현 가이드](./IMPLEMENTATION_GUIDE.md)

## 💬 지원

문제가 발생하면:
1. 로그 확인 (`pnpm dev` 실행 중인 터미널)
2. Prisma Studio로 데이터베이스 상태 확인 (`pnpm prisma studio`)
3. 팀에 문의 또는 이슈 생성

---

**마이그레이션 전 백업은 필수입니다!** 🔐

