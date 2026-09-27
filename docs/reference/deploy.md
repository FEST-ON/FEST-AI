# FESTAI 배포 가이드

Backend·Frontend 배포 절차를 관리합니다. 로컬 개발 환경은 [Backend README](../../backend/README.md#시작하기)와 [Frontend README](../../frontend/README.md#시작하기), 선택 음성 서비스는 [음성 런타임 README](../../backend/voice/README.md)를 따릅니다.

## Backend

모노레포의 `backend`에서 실행합니다. Docker 예시는 로컬 기동 확인용이며 Railway 절차는 배포용입니다.

### Docker

애플리케이션 이미지는 `backend/Dockerfile`로 빌드합니다. PostgreSQL은 별도로 실행되어 있어야 하며 `DATABASE_URL`로 연결합니다.

```bash
docker build -t festival-dx-backend .
docker run --rm -p 8000:8000 --env-file .env \
  -e DATABASE_URL=postgres://festival:festival@host.docker.internal:5432/festival \
  festival-dx-backend
```

위 예시는 호스트에서 `docker compose up -d postgres`로 실행한 로컬 데이터베이스에 연결합니다.

### Railway

`railway.toml`은 Dockerfile 빌드, 배포 전 마이그레이션, `/health/ready` 확인 및 실패 시 재시작(최대 10회)을 설정합니다.

기존 문서에 기록된 데모 API: [https://backend-production-8532.up.railway.app/docs](https://backend-production-8532.up.railway.app/docs)

1. Railway 프로젝트에 PostgreSQL 서비스를 추가합니다.
2. 백엔드 서비스에 `DATABASE_URL`, `JWT_SECRET`, `ENVIRONMENT=production`을 설정합니다.
3. 필요하면 [Backend 설정 예시](../../backend/.env.example)의 값을 재정의합니다.
4. 모노레포를 연결하고 Root Directory와 Docker 빌드 컨텍스트를 `backend`로 설정해 배포합니다. 설정 파일 경로를 지정할 경우 `/backend/railway.toml`을 사용합니다. 서버 포트는 Railway의 `PORT`를 자동으로 사용합니다.

운영 환경의 `JWT_SECRET`은 32자 이상이어야 합니다. 배포 과정에서는 마이그레이션만 자동 실행되며 `scripts.seed`는 실행되지 않습니다. 데모 데이터를 넣을 때만 대상 환경을 확인한 후 별도로 실행합니다.

잡이 API 자원을 잠식할 만큼 늘어나면 같은 이미지로 워커 서비스를 하나 더 띄우고(`startCommand`를 `python -m scripts.worker`로 두고 `DATABASE_URL`을 공유), API 서비스에는 `RUN_INLINE_WORKER=false`를 설정합니다.

직결 배포에서는 `TRUST_PROXY_HEADERS=false`로 설정합니다. 배포 전 남은 점검은 [작업 현황](../tasks.md)을 확인합니다.

## Frontend

모노레포의 `frontend`에서 실행합니다.

프로덕션 빌드를 로컬에서 실행하려면 다음을 사용합니다.

```bash
npm run build
npm run start
```

Vercel CLI로 배포하려면 실행합니다.

```bash
npx vercel
```

또는 GitHub 저장소를 Vercel에 연결하면 자동 배포됩니다. Vercel 프로젝트의 Root Directory를 `frontend`로 설정하고 최소한 다음 환경 변수를 설정합니다.

```dotenv
BACKEND_URL=https://<API_HOST>
NEXT_PUBLIC_FESTIVAL_CODE=EST34-2026
```

`<API_HOST>`는 배포한 API 호스트로 바꿉니다. 지도·번역·아바타·원격 음성을 쓰려면 [Frontend 설정 예시](../../frontend/.env.example)의 나머지 키도 함께 넣습니다. 환경변수를 변경한 뒤에는 새로 배포해야 합니다.

키 교체 등 배포 전 점검은 [작업 현황](../tasks.md)을 확인합니다.
