# Scholub 구현 가이드

## 📊 데이터베이스 설계 완료

Scholub 플랫폼의 데이터베이스 설계가 완료되었습니다. 모든 주요 기능을 지원하는 포괄적인 스키마가 구축되었습니다.

## 🗂️ 구현된 모델 목록

### 핵심 엔티티 (3개)
- ✅ **User**: 사용자 정보, 프로필, 인증
- ✅ **Paper**: 논문 메타데이터, AI 콘텐츠, 통계
- ✅ **Asset**: 파일 관리 (논문 첨부, 썸네일, 아바타)

### 개인화 (3개)
- ✅ **UserPreference**: 맞춤 필터링 설정, 알림 설정
- ✅ **Bookmark**: 찜한 논문, 메모, 폴더
- ✅ **Subscription**: 카테고리/태그/저널/저자 구독

### 소셜 기능 (3개)
- ✅ **Comment**: 댓글 및 대댓글 (계층형)
- ✅ **Discussion**: 토론 스레드 및 메시지
- ✅ **Reaction**: 좋아요/싫어요/공유

### AI 기능 (3개)
- ✅ **ChatSession & ChatMessage**: AI 채팅
- ✅ **PaperRelation**: 논문 간 관계 (비슷한/반대/확장)

### 분석 및 추적 (3개)
- ✅ **PaperView**: 조회 기록
- ✅ **UserActivity**: 사용자 활동 추적
- ✅ **Notification**: 알림 시스템

### 시스템 (2개)
- ✅ **Scheduler**: 정기 작업 관리
- ✅ **Log**: 시스템 로그

**총 17개 모델, 7개 Enum**

## 🎯 주요 기능 지원

### 1. 사용자 맞춤 논문 필터링 ✅
```typescript
// UserPreference 모델로 구현
- interestedCategories: 관심 카테고리
- interestedTags: 관심 태그
- interestedJournals: 관심 저널
- excludedCategories: 제외 카테고리
- minYear: 최소 연도 필터
```

### 2. 알림 서비스 ✅
```typescript
// Notification 모델로 구현
- RECOMMENDED_PAPER: 맞춤 추천
- SIMILAR_PAPER: 비슷한 논문
- OPPOSING_PAPER: 반대 주장 논문
- BOOKMARK_UPDATE: 북마크 업데이트
- COMMENT_REPLY: 댓글 답변
- DISCUSSION_ACTIVITY: 토론 활동
- WEEKLY_DIGEST: 주간 다이제스트
```

**알림 판단 로직:**
- PaperRelation의 type: SIMILAR/OPPOSING으로 관계 정의
- UserActivity의 score로 "열심히 한" 기준 판단
- UserPreference의 알림 설정으로 개인화

### 3. 자료 조사 및 AI Assistant ✅
```typescript
// ChatSession & ChatMessage 모델로 구현
- 메인 페이지: paperId = null
- 특정 논문: paperId = 논문 ID
- referencedPaperIds: 참조된 논문 추적
```

### 4. 뉴스 피드 제공 ✅
```typescript
// Paper 모델의 소셜 기능
- introduction: 뉴스 기사 형식 소개
- Comment: 댓글 기능
- Reaction: 좋아요/싫어요/공유
- 통계: likeCount, commentCount, shareCount
```

### 5. 맞춤형 추천 및 구독 ✅
```typescript
// UserPreference + Subscription
- UserPreference: 기본 관심사 설정
- Subscription: 세부 구독 (카테고리/태그/저널/저자)
- emailFrequency: 이메일 발송 빈도
```

## 📋 다음 단계: API 구현

### 1단계: Paper API
```bash
# 생성할 엔드포인트
POST   /papers              # 논문 생성 (관리자)
GET    /papers              # 논문 목록 (필터링, 페이지네이션)
GET    /papers/:id          # 논문 상세
PATCH  /papers/:id          # 논문 수정
DELETE /papers/:id          # 논문 삭제
GET    /papers/:id/related  # 관련 논문 조회
```

### 2단계: Bookmark API
```bash
POST   /bookmarks           # 북마크 추가
GET    /bookmarks           # 내 북마크 목록
DELETE /bookmarks/:id       # 북마크 삭제
PATCH  /bookmarks/:id       # 북마크 수정 (메모, 폴더)
```

### 3단계: Comment & Discussion API
```bash
POST   /papers/:paperId/comments      # 댓글 작성
GET    /papers/:paperId/comments      # 댓글 목록
PATCH  /comments/:id                  # 댓글 수정
DELETE /comments/:id                  # 댓글 삭제

POST   /papers/:paperId/discussions   # 토론 시작
GET    /papers/:paperId/discussions   # 토론 목록
POST   /discussions/:id/messages      # 토론 메시지 작성
```

### 4단계: Reaction API
```bash
POST   /papers/:paperId/reactions     # 반응 추가/변경
DELETE /papers/:paperId/reactions/:type # 반응 삭제
GET    /papers/:paperId/reactions     # 반응 통계
```

### 5단계: Chat API
```bash
POST   /chat/sessions                 # 채팅 세션 생성
GET    /chat/sessions                 # 내 채팅 세션 목록
POST   /chat/sessions/:id/messages    # 메시지 전송
GET    /chat/sessions/:id/messages    # 메시지 목록
DELETE /chat/sessions/:id             # 세션 삭제
```

### 6단계: Notification API
```bash
GET    /notifications                 # 내 알림 목록
PATCH  /notifications/:id/read        # 알림 읽음 처리
DELETE /notifications/:id             # 알림 삭제
GET    /notifications/unread/count    # 안읽은 알림 수
```

### 7단계: Subscription API
```bash
POST   /subscriptions                 # 구독 추가
GET    /subscriptions                 # 내 구독 목록
DELETE /subscriptions/:id             # 구독 취소
```

### 8단계: Recommendation & Search API
```bash
GET    /recommendations               # 맞춤 추천 논문
GET    /papers/search                 # 논문 검색
GET    /papers/trending               # 인기 논문
GET    /papers/recent                 # 최신 논문
```

## 🔧 백그라운드 작업 (Scheduler)

### 구현 필요 작업
1. **논문 관계 분석**: AI로 논문 간 유사도/반대 여부 계산
2. **알림 생성**: 맞춤 논문, 비슷한 논문 등 알림 자동 생성
3. **이메일 발송**: 구독자에게 정기 이메일 발송
4. **통계 업데이트**: Paper 모델의 통계 데이터 동기화
5. **활동 분석**: UserActivity 기반 참여도 계산

## 📊 성능 최적화 전략

### 1. 캐싱
```typescript
// Redis 캐싱 대상
- 인기 논문 목록
- 사용자 추천 논문
- 논문 통계 (조회수, 좋아요 등)
- 알림 개수
```

### 2. 인덱싱
✅ 모든 주요 쿼리 패턴에 인덱스 적용됨
- userId, paperId 기반 조회
- 날짜 기반 정렬
- 카테고리/태그 필터링

### 3. 비정규화
✅ Paper 모델에 통계 데이터 비정규화 완료
- likeCount, unlikeCount, shareCount
- totalViewCount, commentCount

### 4. 페이지네이션
```typescript
// 커서 기반 페이지네이션 사용 권장
{
  cursor: string,      // 마지막 항목 ID
  limit: number,       // 페이지 크기
  hasMore: boolean     // 다음 페이지 존재 여부
}
```

## 🧪 테스트 데이터

시드 데이터가 준비되어 있습니다:
```bash
cd packages/database
pnpm prisma db seed
```

**포함 데이터:**
- 사용자 3명 (admin, user, researcher)
- 논문 5편 (Transformer, BERT, GPT-3, ResNet, GAN)
- 북마크 2개
- 댓글 2개 (대댓글 포함)
- 반응 3개
- 논문 관계 2개
- 구독 2개

## 🚀 시작하기

### 1. 마이그레이션 실행
```bash
cd packages/database
pnpm prisma migrate dev
```

### 2. Prisma Client 생성
```bash
pnpm prisma generate
```

### 3. 시드 데이터 삽입
```bash
pnpm prisma db seed
```

### 4. Prisma Studio로 확인
```bash
pnpm prisma studio
```

## 📚 참고 문서

- [데이터베이스 설계 상세](./packages/database/DATABASE_DESIGN.md)
- [Database README](./packages/database/README.md)
- [Prisma 공식 문서](https://www.prisma.io/docs)

## 🎯 우선순위 구현 순서

### Phase 1: MVP (2-3주)
1. ✅ 데이터베이스 설계
2. Paper CRUD API
3. User Preference API
4. Bookmark API
5. 기본 검색 및 필터링

### Phase 2: 소셜 기능 (2주)
1. Comment & Reply API
2. Reaction API
3. Discussion API
4. 통계 업데이트 로직

### Phase 3: AI 기능 (2-3주)
1. Chat API
2. 논문 관계 분석 (AI 연동)
3. 추천 알고리즘
4. AI 요약 생성

### Phase 4: 알림 시스템 (1-2주)
1. Notification API
2. 알림 생성 로직
3. 이메일 발송 시스템
4. Scheduler 구현

### Phase 5: 최적화 (1주)
1. 캐싱 구현
2. 성능 튜닝
3. 로그 및 모니터링
4. 테스트 작성

## 💡 개발 팁

### CQRS 패턴 활용
현재 코드베이스는 CQRS 패턴을 사용하고 있습니다:
```
application/
  commands/    # 쓰기 작업 (Create, Update, Delete)
  queries/     # 읽기 작업 (Get, List, Search)
  facades/     # 외부 인터페이스
```

### 트랜잭션 처리
통계 업데이트 시 트랜잭션 사용:
```typescript
await prisma.$transaction(async (tx) => {
  // 1. Reaction 생성
  await tx.reaction.create({ ... });
  
  // 2. Paper 통계 업데이트
  await tx.paper.update({
    where: { id: paperId },
    data: { likeCount: { increment: 1 } }
  });
});
```

### Event-Driven Architecture
UserActivity 기록을 위한 이벤트 발행:
```typescript
// 각 액션 후 UserActivity 생성
await prisma.userActivity.create({
  data: {
    userId,
    paperId,
    type: 'BOOKMARK_PAPER',
    score: 5
  }
});
```

## 🔐 보안 고려사항

1. **인증/인가**: JWT 기반 인증 (이미 구현됨)
2. **Rate Limiting**: API 호출 제한
3. **Input Validation**: DTO 검증
4. **SQL Injection**: Prisma가 자동 방어
5. **XSS**: 프론트엔드에서 sanitize

## 📈 모니터링

### 추적 필요 메트릭
- API 응답 시간
- 데이터베이스 쿼리 성능
- 캐시 히트율
- 알림 발송 성공률
- AI API 호출 횟수/비용

---

**문의사항이나 추가 구현 가이드가 필요하시면 알려주세요!**

