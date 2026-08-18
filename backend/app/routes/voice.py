import base64
import os
from typing import Literal

import httpx
from fastapi import APIRouter, Request
from pydantic import BaseModel, Field

from ..errors import AppError
from ..http import success


router = APIRouter()


class VoiceSynthesisIn(BaseModel):
    text: str = Field(min_length=1, max_length=2_000)
    language: str = Field(default="ko-KR", min_length=2, max_length=16)
    provider: Literal["cosyvoice3", "openvoice-v2", "melotts"] = "cosyvoice3"


def runtime_url() -> str:
    return os.getenv("VOICE_RUNTIME_URL", "").rstrip("/")


@router.get("/voice/health")
def health(request: Request):
    configured = bool(runtime_url())
    return success(request, {"configured": configured, "provider": "cosyvoice3" if configured else None})


@router.post("/voice/synthesize")
def synthesize(body: VoiceSynthesisIn, request: Request):
    """CosyVoice 런타임을 호출하고 브라우저가 재생할 수 있는 base64 오디오를 반환한다.

    모델 가중치와 GPU 의존성은 API 서버에 넣지 않는다. `VOICE_RUNTIME_URL`로 별도
    런타임을 연결하면 기존 축제 API의 인증·프록시·오류 봉투를 유지하면서도 모델을
    독립적으로 교체할 수 있다.
    """
    url = runtime_url()
    if not url:
        raise AppError(503, "VOICE_RUNTIME_NOT_CONFIGURED", "음성 모델 서버가 연결되지 않았습니다.", retryable=True)

    try:
        response = httpx.post(
            f"{url}/v1/speech/synthesize",
            json=body.model_dump(),
            timeout=httpx.Timeout(connect=3, read=30, write=10, pool=3),
        )
        response.raise_for_status()
    except httpx.HTTPStatusError as error:
        raise AppError(503, "VOICE_RUNTIME_FAILED", "음성 모델 서버가 안내 음성을 만들지 못했습니다.", retryable=True) from error
    except httpx.HTTPError as error:
        raise AppError(503, "VOICE_RUNTIME_UNAVAILABLE", "음성 모델 서버에 연결할 수 없습니다.", retryable=True) from error

    content_type = response.headers.get("content-type", "").split(";", 1)[0]
    if content_type.startswith("audio/"):
        audio_base64 = base64.b64encode(response.content).decode("ascii")
        mime_type = content_type
    else:
        try:
            payload = response.json()
        except ValueError as error:
            raise AppError(503, "VOICE_RUNTIME_INVALID_RESPONSE", "음성 모델 서버의 응답 형식이 올바르지 않습니다.", retryable=True) from error
        data = payload.get("data", payload) if isinstance(payload, dict) else {}
        audio_base64 = data.get("audioBase64") or data.get("audio_base64")
        mime_type = data.get("mimeType") or data.get("mime_type") or "audio/wav"
        if not audio_base64:
            raise AppError(503, "VOICE_RUNTIME_NO_AUDIO", "음성 모델 서버가 오디오를 반환하지 않았습니다.", retryable=True)

    return success(request, {
        "audioBase64": audio_base64,
        "mimeType": mime_type,
        "provider": body.provider,
    })
