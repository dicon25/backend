# Scholub Backend API Implementation Summary

## ✅ 완료된 구현 내용

### 1. 데이터베이스 스키마 업데이트
- ✅ `DiscussionMessageLike` 모델 추가
- ✅ Prisma Client 재생성 완료
- ⚠️ **참고**: 데이터베이스 마이그레이션은 DB 연결 설정 후 실행 필요
  ```bash
  cd packages/database
  pnpm run migrate
  ```

### 2. 보안 및 환경 설정
- ✅ `CRAWLER_SECRET_KEY` 환경 변수 추가 (크롤러 인증용)
- ✅ `AI_SERVER_SECRET_KEY` 환경 변수 추가 (AI 서버 인증용)
- ✅ `CrawlerAuthGuard` 구현 (헤더 `X-Secret-Key` 검증)
- ✅ `AiServerAuthGuard` 구현 (헤더 `X-Secret-Key` 검증)

### 3. Paper 모듈 (논문 관리)
**크롤러 전용 API** (`/crawler/papers`)
- ✅ `POST /crawler/papers` - 논문 등록
- ✅ `DELETE /crawler/papers/:paperId` - 논문 삭제

**공개 API** (`/papers`)
- ✅ `GET /papers` - 논문 목록 (페이지네이션, 필터링, 정렬)
- ✅ `GET /papers/:paperId` - 논문 상세 (조회수 자동 증가, 내 반응 포함)
- ✅ `GET /papers/categories` - 카테고리 목록 및 논문 수
- ✅ `GET /papers/categories/:category` - 카테고리별 논문 목록

**구현 세부사항**
- ✅ 논문 조회 시 `PaperView` 자동 생성
- ✅ 로그인 사용자의 `UserActivity` 자동 기록
- ✅ 논문 상세 응답에 `myReaction` 포함 (isLiked, isUnliked)

### 4. Reaction 모듈 (반응 관리)
- ✅ `POST /papers/:paperId/reactions` - 반응 토글 (LIKE/UNLIKE)
- ✅ `GET /papers/:paperId/reactions` - 논문 반응 통계
- ✅ `GET /users/me/reactions` - 내 반응 목록

**구현 세부사항**
- ✅ 같은 타입 재요청 시 삭제 (토글)
- ✅ 다른 타입으로 변경 시 기존 삭제 후 새로 생성
- ✅ Paper의 `likeCount`, `unlikeCount` 자동 업데이트
- ✅ `UserActivity` 자동 생성

### 5. Discussion 모듈 (토론 관리)
**토론 관리**
- ✅ `POST /papers/:paperId/discussions` - 토론 생성
- ✅ `GET /papers/:paperId/discussions` - 논문의 토론 목록
- ✅ `GET /discussions/:discussionId` - 토론 상세

**메시지 관리**
- ✅ `POST /discussions/:discussionId/messages` - 메시지 작성
- ✅ `GET /discussions/:discussionId/messages` - 메시지 목록 (좋아요 여부 포함)
- ✅ `PATCH /discussions/:discussionId/messages/:messageId` - 메시지 수정 (본인만)
- ✅ `DELETE /discussions/:discussionId/messages/:messageId` - 메시지 삭제 (본인만)
- ✅ `POST /discussions/:discussionId/messages/:messageId/like` - 메시지 좋아요 토글

**구현 세부사항**
- ✅ `DiscussionMessageLike` 테이블 활용한 좋아요 관리
- ✅ 메시지 목록에 `isLikedByMe` 포함
- ✅ `participantCount`, `messageCount` 자동 업데이트
- ✅ `UserActivity` 자동 생성

### 6. Chat 모듈 (채팅 - 목데이터)
- ✅ `POST /chat/sessions` - 채팅 세션 생성
- ✅ `GET /chat/sessions` - 내 채팅 세션 목록
- ✅ `GET /chat/sessions/:sessionId` - 세션 상세
- ✅ `POST /chat/sessions/:sessionId/messages` - 메시지 전송
- ✅ `GET /chat/sessions/:sessionId/messages` - 메시지 목록

**구현 세부사항**
- ✅ `AiChatService`에서 목데이터 응답 반환
- ✅ **TODO 주석 포함**: 외부 AI 서버 API 연동 필요
- ✅ 목데이터 응답: "죄송합니다. AI 서버와 연결되지 않았습니다..."

### 7. Notification 모듈 (알림 관리)
- ✅ `GET /notifications` - 알림 목록
- ✅ `GET /notifications/unread-count` - 안읽은 알림 수
- ✅ `PATCH /notifications/:notificationId/read` - 알림 읽음 처리
- ✅ `PATCH /notifications/read-all` - 모든 알림 읽음 처리

### 8. Subscription 모듈 (구독 관리)
- ✅ `POST /subscriptions` - 구독 생성 (CATEGORY/TAG/JOURNAL/AUTHOR)
- ✅ `DELETE /subscriptions/:subscriptionId` - 구독 취소
- ✅ `PATCH /subscriptions/:subscriptionId/toggle` - 구독 활성화/비활성화
- ✅ `GET /subscriptions` - 내 구독 목록

### 9. Preference 모듈 (사용자 설정)
- ✅ `GET /preferences` - 내 설정 조회
- ✅ `PATCH /preferences` - 설정 업데이트

**설정 항목**
- interestedCategories
- excludedCategories
- minYear
- enableNotifications

### 10. Analytics 모듈 (AI 서버 데이터 제공)
**AI 서버 전용 API** (`/ai-data`)
- ✅ `GET /ai-data/activities` - 사용자 활동 데이터
- ✅ `GET /ai-data/reactions` - 반응 데이터
- ✅ `GET /ai-data/relations` - 논문 관계 데이터
- ✅ `GET /ai-data/views` - 조회 기록 데이터
- ✅ `GET /ai-data/users/:userId/profile` - 사용자 프로필

**구현 세부사항**
- ✅ `AiServerAuthGuard`로 보호
- ✅ 페이지네이션 및 날짜 필터 지원
- ✅ 개인정보 보호 (이메일 제외)

### 11. PaperRelation 모듈 (논문 관계)
**크롤러/AI 서버 전용**
- ✅ `POST /crawler/papers/:paperId/relations` - 관계 생성

**공개 API**
- ✅ `GET /papers/:paperId/related` - 모든 관련 논문
- ✅ `GET /papers/:paperId/similar` - 유사 논문
- ✅ `GET /papers/:paperId/opposing` - 반대 논문

**지원하는 관계 타입**
- SIMILAR (유사)
- OPPOSING (반대)
- EXTENSION (확장)
- CITATION (인용)
- RELATED_TOPIC (관련 주제)

### 12. 모듈 통합
- ✅ 모든 모듈이 `FeatureModule`에 통합됨
- ✅ DDD + CQRS 패턴 적용
- ✅ 각 모듈은 독립적으로 동작 가능

## 📁 프로젝트 구조

```
packages/api/src/
├── common/
│   ├── guards/
│   │   ├── crawler-auth.guard.ts
│   │   └── ai-server-auth.guard.ts
│   └── validation/
│       └── env.ts (환경 변수 검증)
├── modules/
│   ├── paper/          # 논문 관리
│   ├── reaction/       # 반응 관리
│   ├── discussion/     # 토론 관리
│   ├── chat/           # 채팅 (목데이터)
│   ├── notification/   # 알림 관리
│   ├── subscription/   # 구독 관리
│   ├── preference/     # 사용자 설정
│   └── analytics/      # AI 서버 데이터 제공
└── app/
    └── integration/
        └── feature.module.ts (모든 모듈 통합)
```

## 🔐 보안

### 필수 환경 변수
```env
# 기존 환경 변수
DATABASE_URL=...
REDIS_URL=...
JWT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=...

# 새로 추가된 환경 변수
CRAWLER_SECRET_KEY=<32자 이상의 랜덤 문자열>
AI_SERVER_SECRET_KEY=<32자 이상의 랜덤 문자열>
```

### 인증 방식
1. **일반 사용자**: JWT Bearer Token
2. **크롤러**: `X-Secret-Key: CRAWLER_SECRET_KEY`
3. **AI 서버**: `X-Secret-Key: AI_SERVER_SECRET_KEY`

## 🚀 다음 단계

### 1. 데이터베이스 마이그레이션
```bash
cd packages/database
pnpm run migrate
```

### 2. 환경 변수 설정
`.env` 파일에 `CRAWLER_SECRET_KEY`와 `AI_SERVER_SECRET_KEY` 추가

### 3. 서버 실행
```bash
cd packages/api
pnpm run start:dev
```

### 4. API 문서 확인
서버 실행 후 `http://localhost:8000/api` 접속

## 📝 TODO 주석이 있는 부분

### Chat 모듈의 AI 연동
- 파일: `packages/api/src/modules/chat/infrastructure/services/ai-chat.service.ts`
- 내용: 외부 AI 서버 API 연동 필요
- 현재: 목데이터 응답 반환

## 🎯 주요 기능 요약

| 모듈 | 주요 기능 | 보안 |
|------|----------|------|
| Paper | 논문 CRUD, 조회수 추적, 카테고리 관리 | 크롤러 전용 / 공개 |
| Reaction | 좋아요/싫어요 토글 | JWT |
| Discussion | 토론 및 메시지 관리, 좋아요 | JWT |
| Chat | AI 채팅 (목데이터) | JWT |
| Notification | 알림 조회 및 읽음 처리 | JWT |
| Subscription | 구독 관리 | JWT |
| Preference | 사용자 설정 | JWT |
| Analytics | AI 서버용 데이터 제공 | AI 서버 전용 |
| PaperRelation | 논문 관계 관리 | 크롤러 전용 / 공개 |

## ✨ 특별 구현 사항

1. **논문 상세 조회 시 내 반응 자동 포함**
2. **토론 메시지 목록에 좋아요 여부 자동 포함**
3. **PaperView 자동 생성 및 조회수 증가**
4. **UserActivity 자동 기록**
5. **트랜잭션 처리** (Reaction 변경, Message Like 등)
6. **권한 검증** (메시지 수정/삭제는 본인만 가능)

## 🔍 테스트 방법

### Swagger UI 사용
1. 서버 실행: `pnpm run start:dev`
2. 브라우저에서 `http://localhost:8000/api` 접속
3. Google OAuth로 로그인하여 JWT 토큰 획득
4. "Authorize" 버튼 클릭하여 토큰 설정
5. 각 엔드포인트 테스트

### 크롤러 API 테스트
```bash
curl -X POST http://localhost:8000/crawler/papers \
  -H "X-Secret-Key: YOUR_CRAWLER_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

## 완료! 🎉

모든 계획된 기능이 구현되었습니다. 데이터베이스 마이그레이션을 실행하고 환경 변수를 설정한 후 서버를 시작하면 바로 사용할 수 있습니다.



