"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AccessibilityLanguage } from "@/entities/visitor";
import type { Dictionary } from "@/shared/lib/i18n";

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

interface UseSpeechRecognitionOptions {
  language: AccessibilityLanguage;
  t: Dictionary;
  onFinalResult: (transcript: string) => void;
}

export function useSpeechRecognition({ language, t, onFinalResult }: UseSpeechRecognitionOptions) {
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
      setError(t.aiGuide.errors.unsupported);
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
      const errorMessages: Record<string, string> = {
        "not-allowed": t.aiGuide.errors.notAllowed,
        "service-not-allowed": t.aiGuide.errors.serviceNotAllowed,
        "audio-capture": t.aiGuide.errors.audioCapture,
        "no-speech": t.aiGuide.errors.noSpeech,
        network: t.aiGuide.errors.network,
      };
      setError(errorMessages[event.error] ?? t.aiGuide.errors.unknown);
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
      setError(t.aiGuide.errors.startFailed);
    }
  }, [language, t]);

  return {
    error,
    interimTranscript,
    isListening,
    isSupported,
    startListening,
    stopListening,
  };
}
