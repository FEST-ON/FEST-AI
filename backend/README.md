# FESTAI Backend

방문객 QR 모바일 웹·운영자 콘솔·참여업체 콘솔이 사용하는 REST API 서버입니다.

## 기술 스택

Python · FastAPI · psycopg · PostgreSQL · PyJWT

의존성은 [pyproject.toml](pyproject.toml)에서 관리합니다. 선택 음성 서비스는 [voice/README.md](voice/README.md)를 참고합니다.

## 시작하기

### 사전 요구사항

- Python 3.12 이상
- Docker

### 설치 및 실행

`backend` 디렉터리에서 실행합니다.

```bash
cp .env.example .env
docker compose up -d postgres
python3 -m venv .venv
.venv/bin/pip install -e '.[dev]'
.venv/bin/python -m scripts.migrate
.venv/bin/python -m scripts.seed
.venv/bin/uvicorn app.main:app --reload
```

### 환경 변수

설정 항목과 예시는 [.env.example](.env.example)을 참고합니다. 배포 환경 설정은 [배포 가이드](../docs/reference/deploy.md)를 따릅니다.

코드의 기본값과 검증 조건은 [app/config.py](app/config.py)에서 확인합니다.

## 사용 방법

### API 접속

- API: `http://localhost:8000/api/v1`
- Swagger UI: `http://localhost:8000/docs`
- OpenAPI: `http://localhost:8000/openapi.json`
- Liveness: `http://localhost:8000/health/live`
- Readiness: `http://localhost:8000/health/ready` (DB 연결까지 확인)

### 데모 계정과 시드

데모 계정의 비밀번호는 모두 `ChangeMe123!`입니다.

| 역할 | 이메일 |
| --- | --- |
| 최고 관리자 | `admin@example.com` |
| 축제 담당자 | `manager@example.com` |
| 검토 담당자 | `reviewer@example.com` |
| 현장 운영자 | `operator@example.com` |
| 참여 상인 | `merchant@example.com` |

`scripts.seed`는 조직·운영자·상인 5명, `EST34-2026` 축제, 구역·시설, 게시 프로그램, 설문, 운영 티켓, E·S·G 승인 실적과 참여업체·쿠폰·혼잡·리워드·운영 문서를 중복 없이 생성합니다. 데모 데이터를 더 채울 때는 다음을 씁니다.

```bash
.venv/bin/python -m scripts.jeju_esg_2026          # 드라이런(롤백), --apply로 커밋
psql "$DATABASE_URL" -f scripts/est34_2026_demo_enrichment.sql   # EST34-2026 운영 데이터 보강
psql "$DATABASE_URL" -f scripts/allen_demo_data.sql              # ALLEN-DEMO-2026 샌드박스 축제
```

시드와 위 계정은 로컬 및 데모 환경 전용입니다. 실제 운영 환경에서는 시드를 실행하지 말고 강한 `JWT_SECRET`과 별도 계정 정책을 사용해야 합니다. 시드를 다시 실행하면 데모 계정 비밀번호가 위 기본값으로 갱신됩니다.

엔드포인트별 요청·응답은 실행 중인 서버의 Swagger UI에서 확인합니다. 보고서 출력 제약은 [구현 계획](../docs/plan.md#리스크-및-미결정)을 참고합니다.

## 테스트

```bash
.venv/bin/python -m pytest -q
.venv/bin/python -m compileall -q app scripts tests
API_URL=http://127.0.0.1:8000/api/v1 .venv/bin/python -m scripts.smoke
```

테스트에는 마이그레이션·시드가 적용된 로컬 PostgreSQL이 필요합니다. DB 연결 실패로 건너뛴 테스트는 통과로 보지 않습니다. `scripts.smoke`에는 실행 중인 API 서버도 필요합니다.

테스트와 스모크는 시드·업무 데이터를 생성하므로 로컬 또는 전용 데모 환경에서만 실행합니다. 검증 범위는 [검증 전략](../docs/plan.md#검증-전략), 상세 케이스는 [tests](tests/)를 참고합니다.

## 관련 문서

| 문서 | 내용 |
| --- | --- |
| [프로젝트 문서](../README.md#관련-문서) | 요구사항·설계·작업 현황·배포 안내 |
| [DB 마이그레이션](db/migrations/) | 스키마·제약 원본 |
| [API 라우터](app/routes/) | 엔드포인트 구현 |
| [음성 런타임](voice/README.md) | CosyVoice 설치·실행·연결 |
| [Frontend](../frontend/README.md) | 화면 실행·환경 설정·배포 |
