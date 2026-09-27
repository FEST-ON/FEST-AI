# FESTAI Voice Runtime

AI 축제 안내 문장을 참조 음성 기반으로 합성하는 선택 음성 서비스입니다. 축제 API와 별도 프로세스로 실행합니다.

## 기술 스택

Python · FastAPI · CosyVoice 3 · PyTorch · SoundFile

런타임 의존성은 [requirements.txt](requirements.txt)에서 관리합니다.

## 시작하기

### 사전 요구사항

- CosyVoice를 실행할 Python·PyTorch·GPU 환경
- CosyVoice 저장소, Fun-CosyVoice3-0.5B 모델 가중치, 참조 WAV 파일

CosyVoice 환경 준비는 [공식 설치 안내](https://github.com/FunAudioLLM/CosyVoice#install)를 따릅니다. 모델 저장소와 가중치는 이 저장소에 포함하지 않습니다.

### 환경 변수

CosyVoice 의존성이 설치된 Python 환경을 활성화한 뒤 런타임을 실행할 셸에서 설정합니다. 아래는 Windows PowerShell 예시입니다.

```powershell
$env:COSYVOICE_REPO_PATH = "C:\models\CosyVoice"
$env:COSYVOICE_MODEL_PATH = "C:\models\Fun-CosyVoice3-0.5B"
$env:COSYVOICE_PROMPT_WAV = "C:\models\CosyVoice\asset\zero_shot_prompt.wav"
```

macOS·Linux 셸에서는 `export COSYVOICE_REPO_PATH=/path/to/CosyVoice`처럼 지정합니다.
참조 WAV 경로를 생략하면 CosyVoice 저장소의 `asset/zero_shot_prompt.wav`를 사용합니다.

### 설치 및 실행

Backend 저장소의 `voice/` 디렉터리에서 실행합니다.

```bash
python -m pip install -r requirements.txt
python -m uvicorn server:app --host 127.0.0.1 --port 8100
```

## 사용 방법

### 프론트엔드 연결

Frontend 저장소의 `.env.local`에 설정하고 Next.js 서버를 다시 실행합니다.

```dotenv
NEXT_PUBLIC_VOICE_MODE=remote
VOICE_RUNTIME_URL=http://127.0.0.1:8100
```

`VOICE_RUNTIME_URL`은 Next.js 서버에서 접근할 주소입니다. 서로 다른 호스트에서 실행하면 해당 런타임 주소로 바꿉니다.
프론트엔드의 `/api/voice/synthesize` 프록시가 런타임을 호출합니다.

### API

실행 중인 서버의 [Swagger UI](http://127.0.0.1:8100/docs)에서 합성을 요청할 수 있습니다. API 구현과 모델 로딩은 [server.py](server.py)에서 관리합니다.

## 테스트

서버 실행 후 별도 터미널에서 상태를 확인합니다. Windows PowerShell에서는 `curl` 대신 `curl.exe`를 사용합니다.

```bash
curl http://127.0.0.1:8100/health
```

`ready: true`는 모델이 메모리에 로드되었음을 뜻합니다. 실제 음성 생성까지 확인하려면 Swagger UI에서 `POST /v1/speech/synthesize`에 안내 문장을 입력합니다. 모델·가중치 없이 상태 응답만 받는 것으로 합성 검증을 대신할 수는 없습니다.

## 관련 문서

| 문서 | 내용 |
| --- | --- |
| [Backend README](../README.md) | 축제 API 실행·테스트 |
| [Frontend README](https://github.com/FEST-ON/Frontend) | 화면 실행·외부 서비스 설정 |
| [프로젝트 문서](https://github.com/FEST-ON/.github#관련-문서) | 요구사항·설계·작업 현황·배포 안내 |
| [CosyVoice](https://github.com/FunAudioLLM/CosyVoice) | 모델 설치·의존성·가중치 안내 |
