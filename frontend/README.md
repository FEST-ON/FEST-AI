# FESTAI Frontend

방문객 QR 모바일 웹·운영자 콘솔·참여업체 콘솔을 제공하는 Next.js 앱입니다.

## 기술 스택

TypeScript · Next.js · React · Tailwind CSS · shadcn · Zustand · TanStack Query

의존성과 실행 스크립트는 [package.json](package.json)에서 관리합니다.

## 시작하기

### 사전 요구사항

- Node.js 20 이상, npm
- [Backend 시작하기](../backend/README.md#시작하기)에 따라 마이그레이션·시드를 적용하고 실행한 API 서버

### 설치 및 실행

`frontend` 디렉터리에서 실행합니다.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

브라우저에서 [로컬 앱](http://localhost:3000)을 엽니다.

### 환경 변수

설정 항목과 예시는 [.env.example](.env.example)을 참고합니다. 배포 환경 설정은 [배포 가이드](../docs/reference/deploy.md)를 따릅니다.

`BACKEND_URL`에는 `/api/v1`을 붙이지 않습니다. `NEXT_PUBLIC_` 접두사가 없는 값은 Next 서버에서만 읽습니다.

## 사용 방법

### 화면 접속

| 대상 | 경로 |
| --- | --- |
| 랜딩 페이지 | `/` |
| 방문객 | `/visitor` |
| 운영자 | `/admin` |
| 참여업체 | `/merchant` |
| 상인 초대 수락 | `/merchant-invite` |

운영자·상인 로그인 정보는 [Backend 데모 계정](../backend/README.md#데모-계정과-시드)을 참고합니다.
전체 화면 경로는 [src/app](src/app/)에서 확인합니다.

### 다국어 사전 재생성

UI 문구의 원본은 `src/shared/lib/i18n/dictionaries/ko.ts` 하나입니다. `en/zh/ja`는 생성물이라
직접 고치지 말고 ko.ts를 고친 뒤 아래를 실행합니다.

```bash
GOOGLE_TRANSLATE_API_KEY=... npm run i18n
```

`npm test`가 ko.ts 해시를 대조하므로, 재생성을 잊으면 테스트가 먼저 깨집니다.

다국어는 **방문객 화면에만** 적용됩니다. 운영자 콘솔(`/admin`)과 참여업체 콘솔(`/merchant`)은
한국어 문구를 화면에 직접 씁니다 — 언어 전환은 방문객 화면의 표시 언어만 바꿉니다.

### 외부 서비스 연결

Kakao 지도는 개발 주소를 Kakao Developers의 도메인에 등록해야 사용할 수 있습니다. 키가 없으면 좌표 목록을 표시합니다.
번역 API 키가 없으면 생성된 UI 사전만 사용하며 운영자가 작성한 콘텐츠는 원문으로 표시합니다.
LiveAvatar 테스트에서는 `LIVEAVATAR_SANDBOX=true`를 사용합니다.

원격 음성의 설치·연결은 [음성 런타임 README](../backend/voice/README.md)를 따릅니다. 원격 합성 실패 시 브라우저 내장 음성으로 대체됩니다.

## 테스트

```bash
npm test
npm run lint
npm run build
```

테스트는 TypeScript 소스를 직접 트랜스파일하므로 사전 빌드가 필요하지 않습니다. 검사 항목은 [tests](tests/), 검증 전략은 [구현 계획](../docs/plan.md#검증-전략)을 참고합니다.

## 관련 문서

| 문서 | 내용 |
| --- | --- |
| [프로젝트 문서](../README.md#관련-문서) | 요구사항·설계·작업 현황·배포 안내 |
| [Backend](../backend/README.md) | 서버 실행·데모 계정·API 접속 |
| [음성 런타임](../backend/voice/README.md) | CosyVoice 설치·실행·연결 |
