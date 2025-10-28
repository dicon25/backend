# Scholub Database Design

## 개요
Scholub은 AI 기반 논문 지식 허브 플랫폼으로, 사용자에게 맞춤형 논문 추천, 뉴스 피드, 토론, AI 채팅 등의 기능을 제공합니다.

## 주요 기능별 데이터 모델

### 1. 핵심 엔티티

#### User (사용자)
- 사용자의 기본 정보 및 인증 정보
- 프로필 (이름, 소개, 아바타)
- 상태 관리 (활성/비활성/정지)

#### Paper (논문)
- 논문의 메타데이터 (제목, 초록, 저자, DOI 등)
- AI 생성 콘텐츠 (요약, 뉴스 형식 소개)
- 카테고리 및 태그 시스템
- 통계 정보 (좋아요, 싫어요, 공유, 조회수, 댓글 수)
- 썸네일 이미지

#### Asset (자산)
- 파일 관리 (논문 첨부파일, 썸네일, 사용자 아바타)
- S3 연동을 위한 키 관리

### 2. 사용자 개인화

#### UserPreference (사용자 설정)
- 관심 카테고리/태그/저널 설정
- 제외 카테고리 설정
- 알림 설정 (맞춤 추천, 비슷한 논문, 반대 주장 논문 등)
- 이메일 알림 빈도 설정

#### Bookmark (북마크)
- 찜한 논문 관리
- 사용자 메모 기능
- 폴더/카테고리 분류

### 3. 소셜 기능

#### Comment (댓글)
- 논문에 대한 댓글 및 토론
- 대댓글 구조 (계층형)
- 좋아요 기능

#### Reaction (반응)
- 좋아요/싫어요/공유 액션
- 중복 방지 (사용자당 논문당 타입당 하나)

#### Discussion (토론)
- 논문별 토론 스레드
- 토론 메시지 (계층형 구조)
- 참여자 및 메시지 수 통계

### 4. 알림 및 구독

#### Notification (알림)
- 다양한 알림 타입 (추천, 비슷한 논문, 반대 주장, 댓글 답변 등)
- 읽음/안읽음 상태
- 우선순위 설정

#### Subscription (구독)
- 카테고리/태그/저널/저자 구독
- 활성/비활성 상태 관리

### 5. AI 기능

#### ChatSession & ChatMessage (AI 채팅)
- 메인 페이지 자료조사 채팅
- 특정 논문에 대한 질문/답변
- 참조된 논문 ID 추적
- 세션별 대화 기록 관리

#### PaperRelation (논문 관계)
- 논문 간 관계 매핑 (비슷한/반대/확장/인용/관련)
- AI 계산 유사도 점수
- 알림 시스템과 연동

### 6. 분석 및 추적

#### PaperView (조회 기록)
- 논문 조회 추적
- 조회 시간 기록
- 비로그인 사용자 추적 (IP/User Agent)

#### UserActivity (사용자 활동)
- 모든 사용자 활동 로깅
- 활동 점수 시스템 (참여도 계산)
- "토론을 열심히 한" 기준 판단 데이터

### 7. 시스템

#### Scheduler (스케줄러)
- 정기 작업 관리 (이메일 발송, 알림 생성 등)
- Cron 표현식 기반
- 실행 이력 추적

#### Log (로그)
- 시스템 로그
- 에러 추적
- 사용자 액션 로깅

## 주요 인덱스 전략

### 성능 최적화를 위한 인덱스
- **Paper**: doi, year, createdAt, categories, tags
- **User**: email
- **Bookmark**: userId, paperId, createdAt
- **Comment**: userId, paperId, parentId, createdAt
- **Reaction**: userId, paperId, type
- **PaperView**: userId, paperId, createdAt
- **Notification**: userId, isRead, type, createdAt
- **UserActivity**: userId, paperId, type, createdAt
- **PaperRelation**: sourcePaperId, relatedPaperId, type

## 알림 시스템 로직

### 1. 맞춤 논문 추천
- `UserPreference`의 관심 카테고리/태그를 기반으로 새 논문 필터링
- 제외 카테고리 및 최소 연도 필터 적용
- `enableRecommendations` 설정 확인

### 2. 비슷한 논문 알림
- `Bookmark` + `PaperRelation` (type: SIMILAR) 조인
- 북마크한 논문과 비슷한 새 논문 발견 시 알림
- `enableSimilarPaperAlerts` 설정 확인

### 3. 반대 주장 논문 알림
- `Bookmark` + `PaperRelation` (type: OPPOSING) 조인
- 북마크한 논문과 반대되는 새 논문 발견 시 알림
- `enableOpposingPaperAlerts` 설정 확인

### 4. 토론 활동 기준
- `UserActivity`에서 활동 타입별 점수 계산
  - `COMMENT`: 5점
  - `REPLY_COMMENT`: 3점
  - `START_DISCUSSION`: 10점
  - `JOIN_DISCUSSION`: 7점
- 특정 논문/분야에서 임계값 이상 점수 달성 시 "열심히 함"으로 판단
- 해당 분야의 비슷한 새 논문 발견 시 알림

## 구독 시스템

### Subscription 타입별 동작
1. **CATEGORY**: 특정 카테고리의 새 논문 알림
2. **TAG**: 특정 태그의 새 논문 알림
3. **JOURNAL**: 특정 저널의 새 논문 알림
4. **AUTHOR**: 특정 저자의 새 논문 알림

### 이메일 발송 빈도
- `UserPreference.emailFrequency` 설정에 따라
- DAILY/WEEKLY/MONTHLY 옵션
- `Scheduler`를 통한 배치 작업

## 데이터 정합성

### Cascade 삭제 규칙
- User 삭제 시: 관련된 모든 데이터 삭제 (Bookmark, Comment, Reaction 등)
- Paper 삭제 시: 관련된 모든 데이터 삭제 (Bookmark, Comment, Reaction 등)
- ChatSession 삭제 시: 모든 ChatMessage 삭제
- Discussion 삭제 시: 모든 DiscussionMessage 삭제

### Unique 제약조건
- User.email: 이메일 중복 방지
- Paper.doi: DOI 중복 방지
- Bookmark(userId, paperId): 중복 북마크 방지
- Reaction(userId, paperId, type): 중복 반응 방지
- Subscription(userId, type, target): 중복 구독 방지
- PaperRelation(sourcePaperId, relatedPaperId, type): 중복 관계 방지

## 통계 데이터 비정규화

성능 향상을 위해 Paper 모델에 통계 데이터를 비정규화:
- `likeCount`: Reaction(type: LIKE) 집계
- `unlikeCount`: Reaction(type: UNLIKE) 집계
- `shareCount`: Reaction(type: SHARE) 집계
- `totalViewCount`: PaperView 집계
- `commentCount`: Comment 집계

이들은 이벤트 발생 시 증감 처리 (Transaction 내에서)

## 확장 고려사항

### 향후 추가 가능한 기능
1. **팔로우 시스템**: User 간 팔로우 관계
2. **추천 알고리즘 개선**: 협업 필터링, 콘텐츠 기반 필터링
3. **뱃지/업적 시스템**: UserActivity 기반 게이미피케이션
4. **논문 컬렉션**: 여러 논문을 묶은 큐레이션
5. **그룹/커뮤니티**: 관심사별 그룹 생성
6. **프리미엄 구독**: 유료 기능 추가

