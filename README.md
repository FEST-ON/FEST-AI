# FESTAI

**AI · ESG 기반 지역축제 DX(디지털 전환) 웹앱**

FESTAI는 지역축제 운영을 "신뢰(Trust)"라는 키워드로 재설계한 플랫폼입니다. 방문객에게는 AI 기반 자연어 안내와 QR 모바일 웹을, 축제 담당 주무관에게는 통합 운영관리·ESG 성과관리 대시보드를 제공합니다. 공개 축제·프로그램·시설·설문·AI 안내와 운영자 인증·프로그램·티켓·ESG 데이터는 FastAPI 백엔드에 연결됩니다.

## 기술 스택

| 영역 | 사용 기술 |
| --- | --- |
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Server State | TanStack Query (FastAPI 연동) |
| Client State | Zustand (`persist` 미들웨어로 일부 상태 로컬 저장) |
| UI Kit | shadcn/ui (base-ui 기반) |
| AI | 백엔드 승인 콘텐츠 기반 검색 응답 |
| Deployment | Vercel |

## 폴더 구조 (FSD 기반)

```
src/
├── app/                     # Next.js App Router, 전역 레이아웃/스타일/프로바이더
│   ├── (public)/visitor/    # 방문객(30대) 화면 — QR 모바일 웹
│   └── (protected)/admin/   # 축제 담당 주무관 화면 — 통합 운영 콘솔
├── shared/                  # 공용 UI(shadcn), 유틸, lib
├── entities/                # 비즈니스 엔티티: festival.ts, program.ts, ticket.ts, esg.ts, visitor.ts, coupon.ts
├── features/                # 유저 상호작용 기능: ai-guide/, accessibility/, complaint-insight/, reservation.ts, rewards.ts
└── widgets/                 # 화면 조합 컴포넌트: site nav/topbar, sidebar, congestion-map, dashboard-stats
```

엔티티는 타입·규칙과 조회를 한 파일에 둡니다. 기능은 파일이 여러 개일 때만 폴더를 씁니다
(`features/reservation.ts` vs `features/ai-guide/{api,model,ui}`).

## 핵심 기능 & 대응 화면

| 스펙 | 화면 경로 |
| --- | --- |
| 6.1 AI 축제 안내 (자연어 Q&A, 맞춤 코스 추천, 혼잡도 기반 안내, 접근성 모드·음성 안내) | `/visitor/ai-guide`, `/visitor/course`, `/visitor/map`(혼잡도 탭), 우측 상단 접근성(♿) 버튼 |
| 6.2 통합 운영관리 (자원 통합관리, 민원/공지/사고 티켓, 운영 대시보드, AI 민원 분류, 현장 혼잡도·대기열, 인력 배치) | `/admin`, `/admin/programs`, `/admin/field`, `/admin/staff`, `/admin/tickets`, `/admin/ai-insights`, `/admin/documents` |
| 6.3 방문객 QR 모바일 웹 (일정/지도/시설/교통, 예약·대기표, 스탬프투어, 디지털 쿠폰, 지역상권 추천) | `/visitor`, `/visitor/map`, `/visitor/schedule`, `/visitor/reservation`, `/visitor/stamp-tour`, `/visitor/coupons`, `/visitor/nearby`, `/visitor/survey` |
| 6.4 ESG 성과관리 (실적 등록·증빙·승인·정정, 데이터 출처/승인 이력, 보고서 생성·승인·내보내기, 리워드 캠페인) | `/admin/esg`, `/admin/rewards` |
| 운영 기준정보·권한 (축제 설정·복제, 편의시설, 참여업체 승인·쿠폰 발행, 계정·권한, 감사 로그 내보내기) | `/admin/festival`, `/admin/businesses`, `/admin/members`, `/admin/audit-logs` |
| 참여업체(상인) 콘솔 (업체 정보 수정·재검수, 쿠폰 발행·사용 처리·취소, 매출 기록, 성과 조회) | `/merchant` |

랜딩 페이지(`/`)에서 방문객·운영자 두 시나리오로 진입할 수 있습니다. 참여업체 계정은 `/merchant`로 접속합니다.

## 실행 방법

### 1) 의존성 설치

```bash
npm install
```

### 2) 백엔드 연결

기본 연결 주소는 `http://127.0.0.1:8000`, 축제 코드는 `EST34-2026`입니다. 다른 환경에서는 프론트엔드 루트의 `.env.local`에 설정합니다.

```bash
cp .env.example .env.local
```

`BACKEND_URL`에는 `/api/v1`을 제외한 백엔드 원점을 입력합니다. 로컬 백엔드를 사용할 때는 마이그레이션·시드·서버를 먼저 실행해야 합니다. 운영자 화면은 백엔드 데모 계정으로 로그인합니다.

### 3) 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

- 방문객 플로우: `/visitor`
- 운영자 플로우: `/admin`

### 4) 프로덕션 빌드 확인

```bash
npm run build
npm run start
```

### 5) 린트

```bash
npm run lint
```

### 6) 다국어 사전 재생성

UI 문구의 원본은 `src/shared/lib/i18n/dictionaries/ko.ts` 하나입니다. `en/zh/ja`는 생성물이라
직접 고치지 말고 ko.ts를 고친 뒤 아래를 실행합니다.

```bash
GOOGLE_TRANSLATE_API_KEY=... npm run i18n
```

`npm test`가 ko.ts 해시를 대조하므로, 재생성을 잊으면 테스트가 먼저 깨집니다.

다국어는 **방문객 화면에만** 적용됩니다. 운영자 콘솔(`/admin`)과 참여업체 콘솔(`/merchant`)은
한국어 문구를 화면에 직접 씁니다 — 언어 전환은 방문객 화면의 표시 언어만 바꿉니다.

## 데이터 & 상태 관리 안내

- 화면에 표시되는 값은 모두 백엔드 API에서 옵니다. 예약·대기, 혼잡도, 쿠폰·포인트, 스탬프, 상권 추천, 민원, ESG 실적까지 실제 데이터로 동작합니다.
- 교통 정보만 연동할 백엔드 API가 없어(3단계 범위) 데모 데이터를 쓰며, 화면에 참고용 안내임을 표시합니다.
- 랜딩 페이지의 축제 정보는 백엔드에서 읽고, 조회에 실패하면 정적 소개 문구로 대체됩니다.
- 접근성 설정(`features/accessibility`)과 방문객 메뉴 노출 설정은 Zustand `persist`로 브라우저 `localStorage`에 저장됩니다.
  첫 페인트 전에 `app/layout.tsx`의 인라인 스크립트가 같은 값을 읽어 `data-*`로 붙이므로 설정이 뒤늦게 적용되며 깜빡이지 않습니다.
- 다크 모드는 운영체제 설정(`prefers-color-scheme`)을 따라갑니다. 화면 안에 별도 토글은 두지 않았습니다. 언어·접근성 선호는 방문 세션에도 함께 반영됩니다.
- 음성 안내를 켜면 브라우저 내장 SpeechSynthesis로 AI 답변을 읽어 줍니다.
- 파일 저장소가 확정되지 않아 ESG 증빙은 외부 `fileId`와 해시를 연결하는 방식입니다.

## Vercel 배포

```bash
npx vercel
```

또는 GitHub 저장소를 Vercel에 연결하면 자동 배포됩니다.

Vercel 프로젝트에는 다음 환경변수를 설정해야 합니다.

```bash
BACKEND_URL=https://backend-production-8532.up.railway.app
NEXT_PUBLIC_FESTIVAL_CODE=EST34-2026
```

환경변수를 변경한 뒤에는 새로 배포해야 합니다.
