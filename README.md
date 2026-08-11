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
├── entities/                # 비즈니스 엔티티: festival, program, ticket, esg, visitor, coupon
├── features/                # 유저 상호작용 기능: ai-guide, ticket-board, reservation, stamp-tour, accessibility, complaint-insight
└── widgets/                 # 화면 조합 컴포넌트: site nav/topbar, sidebar, congestion-map, dashboard-stats
```

## 핵심 기능 & 대응 화면

| 스펙 | 화면 경로 |
| --- | --- |
| 6.1 AI 축제 안내 (자연어 Q&A, 맞춤 코스 추천, 혼잡도 기반 대체 안내, 접근성 모드) | `/visitor/ai-guide`, 우측 상단 접근성(♿) 버튼 |
| 6.2 통합 운영관리 (자원 통합관리, 민원/공지/사고 티켓, 운영 대시보드, AI 민원 분류) | `/admin`, `/admin/programs`, `/admin/tickets`, `/admin/ai-insights` |
| 6.3 방문객 QR 모바일 웹 (일정/지도/시설/교통, 예약·대기표, 스탬프투어, 디지털 쿠폰) | `/visitor`, `/visitor/map`, `/visitor/schedule`, `/visitor/reservation`, `/visitor/stamp-tour`, `/visitor/survey` |
| 6.4 ESG 성과관리 (자동 집계, 사회성과 측정, 데이터 출처/승인 이력, AI 보고서 초안) | `/admin/esg` |

랜딩 페이지(`/`)에서 방문객·운영자 두 시나리오로 진입할 수 있습니다.

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

## 데이터 & 상태 관리 안내

- 백엔드 1단계 범위인 공개 정보, 설문, AI, 운영자 프로그램·티켓·ESG는 실제 API를 사용합니다.
- 백엔드에 아직 없는 예약·대기·혼잡·교통·쿠폰·스탬프 기능은 기존 데모 데이터를 유지합니다.
- 접근성 설정(`features/accessibility`)과 스탬프 투어 진행 상황(`features/stamp-tour`)은 Zustand `persist`로 브라우저 `localStorage`에 저장되어 새로고침 후에도 유지됩니다.
- 운영자 티켓 조회와 상태 변경은 백엔드에 저장됩니다. 방문객 민원 작성과 대기표 발급은 아직 브라우저 상태만 사용합니다.

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
