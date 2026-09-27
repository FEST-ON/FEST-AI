# PLAN — FESTAI

## 구현 방향

| 영역 | 구성 |
| --- | --- |
| Frontend | Next.js 16·React 19·TypeScript·Tailwind 4·shadcn·Zustand·TanStack Query; FSD `app/widgets/features/entities/shared` |
| Backend | FastAPI·Python 3.12·psycopg3·PostgreSQL·PyJWT; `routes/` → 순수 규칙 `domain.py` → SQL `db.py` |
| AI·음성 | `context_repository` → `ai.py`(Alan); `backend/voice/` CosyVoice 3는 선택 별도 프로세스 |
| 데이터·잡 | `db/migrations/001~010` 단방향 마이그레이션, CHECK·트리거; API 내 데몬 워커와 `FOR UPDATE SKIP LOCKED` |

- 브라우저 → Next 서버 전용 `/api/backend/*` 프록시 → FastAPI. 백엔드 원점·외부 API 키는 서버에만 둔다.
- `main.py`에 요청 추적·오류 변환·레이트 리밋을 모은다. 프론트 엔티티는 타입·규칙·조회를 한 파일에, 기능은 여러 파일일 때만 폴더로 둔다. 다국어 사전 생성물은 커밋한다.
- Backend는 Docker/Railway: 배포 전 마이그레이션, `/health/ready`, 실패 시 재시작. Frontend는 Vercel. 배포 시 시드 실행 금지.

## 단계별 계획

1. 노출 키를 폐기·재발급한다(저장소 예시 값·프록시 신뢰 설정은 반영 완료).
2. PDF 한글 폰트와 현장 기록 이관을 보완하고, 증빙 제공자 확정 후 업로드를 연결한다.
3. 다중 인스턴스 시 레이트 리밋 카운터를 공유 저장소로 옮긴다. 현재 범위 밖 기능은 후속 3단계에서 검토한다.

## 검증 전략

- Backend `pytest`: 도메인·집계·AI는 DB 없이, API·SQL은 마이그레이션·시드가 적용된 PostgreSQL에서 실행한다. DB 부재에 따른 skip은 통과가 아니다.
- Frontend `node --test tests/*.test.mjs`: 규칙·사전 검사(TS 직접 트랜스파일).
- `scripts.smoke`: [완료 기준](spec.md#완료-기준) 확인. 쓰기가 발생하므로 로컬·데모 환경에서만 실행한다.

## 리스크 및 미결정

| 항목 | 대응 |
| --- | --- |
| 레이트 리밋·로그인 잠금이 프로세스 로컬 | 다중 인스턴스 전 Redis 등 공유 저장소로 이전 |
| 워커가 API와 자원을 공유 | 부하 증가 시 `scripts.worker`를 전용 서비스로 띄우고 API는 `RUN_INLINE_WORKER=false` |
| PDF 표준 14폰트의 한글 손실 | DOCX와 `textLossWarning` 제공, 한글 폰트 임베딩 보완 |
| 플로깅·다회용기 기록이 `localStorage`에만 존재 | 백엔드 API 확정 후 이관 |
| 증빙 파일 외부 의존 | 저장소·악성코드 검사 제공자 확정 필요 |
