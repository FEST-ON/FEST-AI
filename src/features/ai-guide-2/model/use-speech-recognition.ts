"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AccessibilityLanguage } from "@/entities/visitor";

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionResultListLike {
  length: number;
  [index: number]: SpeechRecognitionResultLike;
}

interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultListLike;
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface SpeechRecognitionConstructorLike {
  new (): SpeechRecognitionLike;
}

type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructorLike;
  webkitSpeechRecognition?: SpeechRecognitionConstructorLike;
};

const LANGUAGE_CODES: Record<AccessibilityLanguage, string> = {
  한국어: "ko-KR",
  English: "en-US",
  中文: "zh-CN",
  日本語: "ja-JP",
};

const ERROR_MESSAGES: Record<string, string> = {
  "not-allowed": "마이크 권한이 차단됐어요. 브라우저 설정에서 권한을 허용해주세요.",
  "service-not-allowed": "이 브라우저에서는 음성인식 서비스를 사용할 수 없어요.",
  "audio-capture": "사용 가능한 마이크를 찾지 못했어요.",
  "no-speech": "음성이 들리지 않았어요. 다시 눌러 말해주세요.",
  network: "음성인식 연결이 원활하지 않아요. 잠시 후 다시 시도해주세요.",
};

interface UseSpeechRecognitionOptions {
  language: AccessibilityLanguage;
  onFinalResult: (transcript: string) => void;
}

export function useSpeechRecognition({ language, onFinalResult }: UseSpeechRecognitionOptions) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalTranscriptRef = useRef("");
  const onFinalResultRef = useRef(onFinalResult);
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onFinalResultRef.current = onFinalResult;
  }, [onFinalResult]);

  useEffect(() => {
    const speechWindow = window as SpeechRecognitionWindow;
    const frame = window.requestAnimationFrame(() => {
      setIsSupported(Boolean(speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition));
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    return () => recognitionRef.current?.abort();
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const startListening = useCallback(() => {
    const speechWindow = window as SpeechRecognitionWindow;
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;

    if (!Recognition) {
      setError("이 브라우저는 음성인식을 지원하지 않아요. 텍스트로 질문해주세요.");
      return;
    }

    recognitionRef.current?.abort();
    finalTranscriptRef.current = "";
    setInterimTranscript("");
    setError(null);

    const recognition = new Recognition();
    recognition.lang = LANGUAGE_CODES[language];
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      let interim = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result[0]?.transcript ?? "";

        if (result.isFinal) finalTranscriptRef.current += transcript;
        else interim += transcript;
      }

      setInterimTranscript(interim || finalTranscriptRef.current);
    };
    recognition.onerror = (event) => {
      setError(ERROR_MESSAGES[event.error] ?? "음성을 인식하지 못했어요. 다시 시도해주세요.");
    };
    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript("");
      recognitionRef.current = null;

      const transcript = finalTranscriptRef.current.trim();
      finalTranscriptRef.current = "";
      if (transcript) onFinalResultRef.current(transcript);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setIsListening(false);
      setError("마이크를 시작하지 못했어요. 잠시 후 다시 시도해주세요.");
    }
  }, [language]);

  return {
    error,
    interimTranscript,
    isListening,
    isSupported,
    startListening,
    stopListening,
  };
}
