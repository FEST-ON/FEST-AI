"""CosyVoice 3 model runtime for the festival AI guide.

This process is intentionally separate from ``app.main``. CosyVoice brings a large
PyTorch runtime and model weights, so the transactional festival API should remain
lightweight and can proxy to this service through VOICE_RUNTIME_URL.
"""

import io
import base64
import os
import sys
import threading
from functools import lru_cache

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field


class SynthesisRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2_000)
    language: str = Field(default="ko-KR", min_length=2, max_length=16)
    provider: str = "cosyvoice3"


app = FastAPI(title="FEST-ON Voice Runtime", version="0.1.0")
_load_lock = threading.Lock()


def _setting(name: str) -> str:
    return os.getenv(name, "").strip()


@lru_cache(maxsize=1)
def _cosyvoice():
    repo_path = _setting("COSYVOICE_REPO_PATH")
    model_path = _setting("COSYVOICE_MODEL_PATH")
    if not repo_path or not model_path:
        raise RuntimeError("COSYVOICE_REPO_PATH와 COSYVOICE_MODEL_PATH를 설정해 주세요.")
    if repo_path not in sys.path:
        sys.path.insert(0, repo_path)
    try:
        from cosyvoice.cli.cosyvoice import CosyVoice3
    except ImportError as error:
        raise RuntimeError("CosyVoice 저장소 의존성이 설치되지 않았습니다.") from error
    with _load_lock:
        return CosyVoice3(model_path)


def _wav_bytes(speech, sample_rate: int) -> bytes:
    import numpy as np
    import soundfile as sf

    samples = speech.squeeze().detach().cpu().numpy().astype(np.float32)
    buffer = io.BytesIO()
    sf.write(buffer, samples, sample_rate, format="WAV", subtype="PCM_16")
    return buffer.getvalue()


def _synthesize_with_cosyvoice(text: str) -> bytes:
    engine = _cosyvoice()
    speaker = _setting("COSYVOICE_SPEAKER") or "中文女"
    # Fun-CosyVoice3의 SFT 화자를 기본값으로 사용한다. 같은 여성 안내 음성을
    # 고정하려면 모델에 맞는 speaker ID를 COSYVOICE_SPEAKER로 지정한다.
    result = next(engine.inference_sft(text, speaker, stream=False))
    sample_rate = int(getattr(engine, "sample_rate", 22_050))
    return _wav_bytes(result["tts_speech"], sample_rate)


@app.get("/health")
def health():
    return {
        "status": "configured" if _setting("COSYVOICE_MODEL_PATH") else "not_configured",
        "provider": "cosyvoice3",
    }


@app.post("/v1/speech/synthesize")
def synthesize(body: SynthesisRequest):
    if body.provider != "cosyvoice3":
        raise HTTPException(status_code=501, detail="현재 로컬 런타임은 CosyVoice 3를 지원합니다.")
    try:
        audio = _synthesize_with_cosyvoice(body.text)
    except Exception as error:  # 모델 로딩·GPU·가중치 오류를 API 응답으로 변환
        raise HTTPException(status_code=503, detail=str(error)) from error
    return {
        "audioBase64": base64.b64encode(audio).decode("ascii"),
        "mimeType": "audio/wav",
        "provider": "cosyvoice3",
    }
