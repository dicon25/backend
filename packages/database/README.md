# Scholub Database Package

Scholub 플랫폼의 데이터베이스 스키마 및 Prisma 클라이언트를 관리하는 패키지입니다.

## 📋 목차

- [설치](#설치)
- [스키마 구조](#스키마-구조)
- [마이그레이션](#마이그레이션)
- [Prisma Studio](#prisma-studio)
- [시드 데이터](#시드-데이터)

## 🚀 설치

```bash
pnpm install
```

## 📊 스키마 구조

데이터베이스 스키마는 기능별로 분리된 모델 파일들로 구성되어 있습니다:

### 핵심 엔티티
- **user.prisma**: 사용자 정보 및 인증
- **paper.prisma**: 논문 메타데이터 및 AI 생성 콘텐츠
- **asset.prisma**: 파일 및 이미지 관리

### 개인화 및 설정
- **preference.prisma**: 사용자 맞춤 설정 및 관심사
- **bookmark.prisma**: 찜한 논문
- **subscription.prisma**: 카테고리/태그/저널/저자 구독

### 소셜 기능
- **comment.prisma**: 댓글 및 토론
- **discussion.prisma**: 토론 스레드 및 메시지
- **reaction.prisma**: 좋아요/싫어요/공유

### AI 기능
- **chat.prisma**: AI 채팅 세션 및 메시지
- **relation.prisma**: 논문 간 관계 (비슷한/반대/확장 등)

### 분석 및 추적
- **view.prisma**: 논문 조회 기록
- **activity.prisma**: 사용자 활동 추적
- **notification.prisma**: 알림

### 시스템
- **scheduler.prisma**: 스케줄러 및 크론 작업
- **log.prisma**: 시스템 로그

상세한 설계 문서는 [DATABASE_DESIGN.md](./DATABASE_DESIGN.md)를 참조하세요.

## 🔄 마이그레이션

### 마이그레이션 생성

스키마를 수정한 후 마이그레이션을 생성합니다:

```bash
pnpm prisma migrate dev --name your_migration_name
```

### 마이그레이션 적용

개발 환경:
```bash
pnpm prisma migrate dev
```

프로덕션 환경:
```bash
pnpm prisma migrate deploy
```

### 마이그레이션 상태 확인

```bash
pnpm prisma migrate status
```

### 마이그레이션 롤백

마이그레이션을 롤백하려면:
```bash
pnpm prisma migrate resolve --rolled-back migration_name
```

## 🎨 Prisma Studio

Prisma Studio를 사용하여 데이터베이스를 GUI로 관리할 수 있습니다:

```bash
pnpm prisma studio
```

브라우저에서 http://localhost:5555 로 접속합니다.

## 🌱 시드 데이터

개발 환경에서 초기 데이터를 삽입하려면:

```bash
pnpm prisma db seed
```

시드 스크립트는 `prisma/seed.ts`에 정의되어 있습니다.

## 📝 스키마 포맷팅

스키마 파일을 포맷팅하려면:

```bash
pnpm prisma format
```

## ✅ 스키마 검증

스키마의 유효성을 검증하려면:

```bash
pnpm prisma validate
```

## 🔧 Prisma Client 생성

Prisma Client를 재생성하려면:

```bash
pnpm prisma generate
```

## 📚 주요 명령어 요약

| 명령어 | 설명 |
|--------|------|
| `pnpm prisma migrate dev` | 마이그레이션 생성 및 적용 (개발) |
| `pnpm prisma migrate deploy` | 마이그레이션 적용 (프로덕션) |
| `pnpm prisma migrate status` | 마이그레이션 상태 확인 |
| `pnpm prisma studio` | Prisma Studio 실행 |
| `pnpm prisma db seed` | 시드 데이터 삽입 |
| `pnpm prisma format` | 스키마 포맷팅 |
| `pnpm prisma validate` | 스키마 검증 |
| `pnpm prisma generate` | Prisma Client 생성 |
| `pnpm prisma db push` | 마이그레이션 없이 스키마 동기화 (개발용) |
| `pnpm prisma db pull` | 데이터베이스에서 스키마 가져오기 |

## 🌍 환경 변수

`.env` 파일에 다음 환경 변수를 설정해야 합니다:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/scholub?schema=public"
```

## 📖 추가 문서

- [Prisma 공식 문서](https://www.prisma.io/docs)
- [Scholub Database Design](./DATABASE_DESIGN.md)

## 🤝 기여

스키마를 수정할 때는 다음 사항을 준수해주세요:

1. 모델은 기능별로 분리된 파일에 작성
2. 적절한 인덱스 추가
3. 관계 설정 시 `onDelete` 액션 명시
4. 마이그레이션 생성 후 테스트
5. DATABASE_DESIGN.md 문서 업데이트

