"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bus,
  CalendarDays,
  CheckCircle2,
  Flag,
  Headset,
  Keyboard,
  Languages,
  MapPin,
  Mic,
  Phone,
  RotateCcw,
  SendHorizontal,
  Square,
  Sparkles,
  Users,
  Volume2,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { SUPPORT_PHONE, SUPPORT_PHONE_HREF } from "@/shared/lib/support-contact";
import { LastUpdated } from "@/shared/ui/last-updated";
import { Form } from "@/shared/ui/form";
import { AccessibilitySheet } from "@/features/accessibility/ui/accessibility-sheet";
import { useAccessibilityStore } from "@/features/accessibility/model/store";
import { useFestivalLanguages } from "@/features/accessibility/model/use-festival-languages";
import { useSpeechOutput } from "@/features/accessibility/model/use-speech-output";
import { detectLocale, dictionaries, LANGUAGE_BY_LOCALE, useTranslation } from "@/shared/lib/i18n";
import type { Locale } from "@/shared/lib/i18n";
import { buildMessage, generateReply, loadHistory, reportAiMessage, resetConversation } from "../lib/generate-reply";
import { useChatStore, WELCOME_MESSAGE_ID } from "../model/chat-store";
import { useSpeechRecognition } from "../model/use-speech-recognition";

const QUESTION_ICON = {
  congestion: Users,
  transport: Bus,
  facility: MapPin,
  schedule: CalendarDays,
} as const;

export function PersoAiGuide() {
  const { t, locale, bcp47 } = useTranslation();
  const { messages, isTyping, addMessage, setTyping, reset, syncWelcome, restoreMessages } = useChatStore();
  const { largeText, voiceGuide, visitorMode, languageSource, setLanguage } = useAccessibilityStore();
  const { languages } = useFestivalLanguages();
  const [draft, setDraft] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const [reportStatus, setReportStatus] = useState<"idle" | "pending" | "done" | "error">("idle");
  const [switchedFrom, setSwitchedFrom] = useState<Locale | null>(null);

  const welcomeMessage = useMemo(
    () => ({
      id: WELCOME_MESSAGE_ID,
      role: "assistant" as const,
      content: t.aiGuide.welcomeContent,
      timestamp: t.aiGuide.welcomeTimestamp,
      sources: [t.aiGuide.welcomeSource],
    }),
    [t],
  );

  useEffect(() => {
    syncWelcome(welcomeMessage);
  }, [welcomeMessage, syncWelcome]);

  // 새로고침하면 대화가 사라진 것처럼 보였다 — 서버에 남아 있는 이전 대화를 한 번 복원한다.
  // 이미 대화가 오갔으면(환영 문구 외에 메시지가 있으면) 건드리지 않는다.
  useEffect(() => {
    let cancelled = false;
    if (messages.some((message) => message.id !== WELCOME_MESSAGE_ID)) return;
    loadHistory(locale).then((history) => {
      if (cancelled || history.length === 0) return;
      restoreMessages([
        welcomeMessage,
        ...history.map((entry) => buildMessage(entry.role, entry.content, locale, {
          backendMessageId: entry.role === "assistant" ? entry.messageId : undefined,
          freshnessAt: entry.freshnessAt,
          needsFallbackChannel: entry.needsFallbackChannel,
        })),
      ]);
    });
    return () => { cancelled = true; };
    // 최초 진입과 언어 전환 때만 복원한다. messages를 의존성에 넣으면 매 메시지마다 다시 돈다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, welcomeMessage]);

  const latestAssistantMessage = [...messages].reverse().find((message) => message.role === "assistant");

  // 새 말풍선이 붙으면 가장 최근 대화가 보이도록 맨 아래로 따라간다.
  useEffect(() => {
    const thread = threadRef.current;
    if (thread) thread.scrollTop = thread.scrollHeight;
  }, [messages, isTyping]);

  useSpeechOutput(latestAssistantMessage?.content, { enabled: voiceGuide, bcp47 });

  // 자동 전환된 언어로 바로 답해야 해서 사용할 언어를 인자로 받는다(전환 직후 locale은 아직 이전 값).
  const handleAsk = useCallback(async (question: string, askLocale: Locale = locale) => {
    if (isTyping) return;

    addMessage(buildMessage("user", question, askLocale));
    setTyping(true);
    setReportStatus("idle");

    try {
      const reply = await generateReply(question, askLocale);
      addMessage(buildMessage("assistant", reply.content, askLocale, {
        sources: reply.sources,
        backendMessageId: reply.messageId,
        freshnessAt: reply.freshnessAt,
        needsFallbackChannel: reply.needsFallbackChannel,
      }));
    } catch {
      // 답변 자체를 받지 못한 경우도 근거가 없는 상황이라 대체 채널을 함께 안내한다.
      // 자동 전환 직후에는 t가 아직 이전 언어라 실패 안내도 물어본 언어로 맞춘다.
      addMessage(buildMessage("assistant", dictionaries[askLocale].aiGuide.replyFailed, askLocale, { needsFallbackChannel: true }));
    } finally {
      setTyping(false);
    }
  }, [addMessage, isTyping, setTyping, locale]);

  // AI-05: 키오스크에서 방문객이 언어를 직접 고르기 전까지는 발화 언어를 따라간다.
  // 판별 실패·미지원 언어면 detectLocale이 null을 주고 기존(축제 기본) 언어를 유지한다.
  const handleVoiceResult = useCallback((transcript: string) => {
    const autoLocale = visitorMode === "kiosk" && languageSource !== "MANUAL"
      ? detectLocale(transcript, languages)
      : null;
    if (autoLocale && autoLocale !== locale) {
      setLanguage(autoLocale, "AUTO");
      setSwitchedFrom(locale);
      void handleAsk(transcript, autoLocale);
      return;
    }
    void handleAsk(transcript);
  }, [handleAsk, languageSource, languages, locale, setLanguage, visitorMode]);

  function revertLanguage() {
    if (!switchedFrom) return;
    // 되돌리면 방문객이 고른 언어가 되므로 다음 발화에서 다시 자동 전환되지 않는다.
    setLanguage(switchedFrom, "MANUAL");
    setSwitchedFrom(null);
  }

  async function reportLatestAnswer() {
    if (!latestAssistantMessage?.backendMessageId || reportStatus === "pending") return;
    setReportStatus("pending");
    try {
      await reportAiMessage(latestAssistantMessage.backendMessageId);
      setReportStatus("done");
    } catch {
      setReportStatus("error");
    }
  }

  const {
    error: speechError,
    interimTranscript,
    isListening,
    isSupported: isSpeechSupported,
    startListening,
    stopListening,
  } = useSpeechRecognition({ bcp47, t, onFinalResult: handleVoiceResult });

  // 음성 인식을 못 쓰는 브라우저(또는 소음이 큰 현장)에서는 글로 묻는 게 유일한 길이라 처음부터 열어 둔다.
  const textInputOpen = showTextInput || !isSpeechSupported;

  // 패널은 내용만큼 자라고 아래 범위 안에서 멈춘다. 넘치면 대화 영역이 스크롤한다.
  // 글자 수로 높이를 추정하던 자리 — 큰 글씨·줄바꿈에 따라 어긋나던 것을 실제 레이아웃에 맡긴다.
  const chatPanelHeight = textInputOpen ? "min-h-[400px] max-h-[470px]" : "min-h-[340px] max-h-[450px]";

  function handleSubmit() {
    const question = draft.trim();
    if (!question || isTyping || isListening) return;

    setDraft("");
    handleAsk(question);
  }

  return (
    <section className="relative isolate flex h-full min-h-0 flex-col overflow-hidden bg-slate-950 text-white">
      <Image
        src="/images/perso-ai-guide.png"
        alt={t.aiGuide.imageAlt}
        fill
        priority
        sizes="(max-width: 448px) 100vw, 448px"
        className="-z-10 object-cover object-[center_10%]"
      />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-b from-slate-950/10 via-slate-950/5 to-slate-950/50" />

      <div className="absolute left-1/2 top-4 z-30 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-white/20 bg-slate-950/45 px-3 py-2 text-[0.6875rem] font-semibold text-white/90 backdrop-blur-md">
        <Volume2 className="size-3.5 text-cyan-300" />
        {t.aiGuide.voiceReadyBadge}
      </div>

      <div className="absolute right-4 top-4 z-30 flex items-center gap-2">
        <AccessibilitySheet triggerClassName="size-10 border-white/20 bg-slate-950/40 text-white backdrop-blur-md hover:bg-slate-950/60 hover:text-white" />
        <button
          type="button"
          aria-label={t.aiGuide.resetAria}
          onClick={() => { resetConversation(); reset(welcomeMessage); setReportStatus("idle"); setSwitchedFrom(null); }}
          className="flex size-10 items-center justify-center rounded-full border border-white/20 bg-slate-950/40 text-white backdrop-blur-md transition hover:bg-slate-950/60"
        >
          <RotateCcw className="size-4" />
        </button>
      </div>

      <div
        className={cn(
          "absolute inset-x-0 bottom-0 z-10 flex flex-col overflow-hidden rounded-t-[30px] border-t border-white/45 bg-white/70 text-foreground shadow-[0_-18px_52px_rgba(15,23,42,0.38)] backdrop-blur-xl transition-[min-height,max-height] duration-300 ease-out dark:bg-slate-950/68",
          chatPanelHeight,
        )}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-12 bg-linear-to-b from-white/90 via-white/40 to-transparent dark:from-slate-950/85 dark:via-slate-950/35" />

        <div
          ref={threadRef}
          className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-3 pt-8"
          style={{
            maskImage: "linear-gradient(to bottom, transparent 0, black 36px, black 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0, black 36px, black 100%)",
          }}
        >
          {/* 마지막 한 마디만 남기면 앞서 안내받은 시간·장소를 다시 볼 수 없다 — 대화를 통째로 보여준다. */}
          {messages.map((message) =>
            message.role === "user" ? (
              <div key={message.id} className="flex justify-end">
                <p className="max-w-[82%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-[0.8125rem] leading-relaxed whitespace-pre-line text-primary-foreground">
                  {message.content}
                </p>
              </div>
            ) : (
              <div
                key={message.id}
                className="rounded-2xl border border-white/55 bg-white/78 px-3.5 py-2.5 text-[0.8125rem] leading-relaxed whitespace-pre-line text-card-foreground shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-slate-900/72"
              >
                <span className="mb-1 flex items-center gap-1 text-[0.625rem] font-bold text-primary">
                  <Sparkles className="size-3" /> {t.aiGuide.assistantLabel}
                </span>
                {message.content}
                {(message.sources?.length || message.freshnessAt) && (
                  <div className="mt-1.5 space-y-0.5 border-t border-border/70 pt-1.5">
                    {message.sources && message.sources.length > 0 && (
                      <p className="text-[0.5625rem] opacity-60">
                        {t.aiGuide.sourcePrefix}{message.sources.join(", ")}
                      </p>
                    )}
                    <LastUpdated
                      value={message.freshnessAt}
                      bcp47={bcp47}
                      label={t.aiGuide.answerFreshness}
                      className="text-[0.5625rem] opacity-60"
                    />
                  </div>
                )}

                {message.needsFallbackChannel && (
                  <div className="mt-2 rounded-xl border border-amber-300/70 bg-amber-50/90 p-2.5 text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100">
                    <p className="flex items-center gap-1 text-[0.625rem] font-bold">
                      <Headset className="size-3" /> {t.aiGuide.fallbackChannelTitle}
                    </p>
                    <p className="mt-1 text-[0.625rem] leading-4">{t.aiGuide.fallbackChannelDescription}</p>
                    <a
                      href={SUPPORT_PHONE_HREF}
                      className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-amber-900 px-2.5 py-1 text-[0.625rem] font-bold text-white dark:bg-amber-100 dark:text-amber-950"
                    >
                      <Phone className="size-3" /> {t.aiGuide.fallbackCallAction(SUPPORT_PHONE)}
                    </a>
                  </div>
                )}
                {/* 신고 상태는 한 벌뿐이라 방금 받은 답변에만 붙인다. */}
                {message.backendMessageId && message.id === latestAssistantMessage?.id && (
                  <div className="mt-2 flex items-center justify-end border-t border-border/70 pt-2">
                    <button
                      type="button"
                      onClick={() => void reportLatestAnswer()}
                      disabled={reportStatus === "pending" || reportStatus === "done"}
                      className="inline-flex min-h-9 items-center gap-1 text-[0.625rem] font-semibold text-muted-foreground hover:text-foreground disabled:opacity-60"
                    >
                      {reportStatus === "done" ? <CheckCircle2 className="size-3" /> : <Flag className="size-3" />}
                      {reportStatus === "pending" ? t.aiGuide.reportPending : reportStatus === "done" ? t.aiGuide.reportDone : t.aiGuide.reportAction}
                    </button>
                  </div>
                )}
                {reportStatus === "error" && message.id === latestAssistantMessage?.id && (
                  <p className="mt-1 text-right text-[0.5625rem] text-red-600">{t.aiGuide.reportFailed}</p>
                )}
              </div>
            ),
          )}

          {isTyping && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-border bg-card px-4 py-3">
                {[0, 1, 2].map((index) => (
                  <span
                    key={index}
                    className="size-1.5 animate-bounce rounded-full bg-primary/60"
                    style={{ animationDelay: `${index * 120}ms` }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="relative z-30 shrink-0 bg-transparent px-4 pb-2 pt-1.5">
          {switchedFrom && (
            <div
              aria-live="polite"
              className="mb-2 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-[0.6875rem] font-semibold text-foreground"
            >
              <Languages className="size-3.5 shrink-0 text-primary" />
              <span className="min-w-0 flex-1">{t.aiGuide.autoSwitchNotice(LANGUAGE_BY_LOCALE[locale])}</span>
              <button
                type="button"
                onClick={revertLanguage}
                lang={switchedFrom}
                aria-label={t.aiGuide.autoSwitchRevertAria(LANGUAGE_BY_LOCALE[switchedFrom])}
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 font-bold text-foreground"
              >
                <RotateCcw className="size-3" />
                {LANGUAGE_BY_LOCALE[switchedFrom]}
              </button>
            </div>
          )}

          <div className="flex flex-col items-center pb-1">
            <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center">
              <span aria-hidden="true" />
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                disabled={isTyping || !isSpeechSupported}
                aria-label={isListening ? t.aiGuide.micStopAria : t.aiGuide.micStartAria}
                aria-pressed={isListening}
                className={cn(
                  "relative flex size-16 shrink-0 items-center justify-center rounded-full border-4 border-white/80 text-white shadow-[0_8px_24px_rgba(1,71,255,0.35)] transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-35",
                  isListening ? "bg-red-500 hover:bg-red-600" : "bg-primary hover:bg-primary/90",
                )}
              >
                {isListening && <span className="absolute -inset-2 animate-ping rounded-full border-2 border-red-400/45" />}
                {isListening ? <Square className="relative size-5 fill-current" /> : <Mic className="size-7" />}
              </button>

              <div className="flex justify-start pl-3">
                <button
                  type="button"
                  onClick={() => setShowTextInput((visible) => !visible)}
                  disabled={isListening}
                  aria-label={textInputOpen ? t.aiGuide.keyboardCloseAria : t.aiGuide.keyboardOpenAria}
                  aria-expanded={textInputOpen}
                  aria-controls="perso-text-question"
                  className={cn(
                    "flex size-14 shrink-0 items-center justify-center rounded-full border-2 border-white/75 shadow-sm backdrop-blur-md transition active:scale-95 disabled:opacity-40",
                    textInputOpen
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                      : "bg-white/82 text-slate-700 hover:bg-white dark:bg-slate-900/78 dark:text-white",
                  )}
                >
                  <Keyboard className="size-6" />
                </button>
              </div>
            </div>

            <p className="mt-1.5 min-h-4 text-center text-[0.625rem] font-semibold text-foreground/80">
              {isListening ? interimTranscript || t.aiGuide.listeningPlaceholder : t.aiGuide.idlePrompt}
            </p>

            {textInputOpen && (
              <Form
                id="perso-text-question"
                onSubmit={handleSubmit}
                className="mt-2 flex w-full items-center gap-1.5 rounded-2xl border border-white/65 bg-white/88 p-1.5 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-slate-900/82"
              >
                <input
                  autoFocus
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  disabled={isTyping}
                  aria-label={t.aiGuide.textInputAria}
                  placeholder={t.aiGuide.textInputPlaceholder}
                  className="min-h-11 min-w-0 flex-1 bg-transparent px-2 text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground/75"
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || isTyping}
                  aria-label={t.aiGuide.sendAria}
                  className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <SendHorizontal className="size-4" />
                </button>
              </Form>
            )}
          </div>

          <p
            aria-live="polite"
            className={cn(
              "min-h-4 px-1 pt-1 text-[0.5625rem] font-medium text-muted-foreground",
              speechError && "text-red-600 dark:text-red-300",
              isListening && "text-red-600 dark:text-red-300",
            )}
          >
            {speechError ??
              (isListening
                ? t.aiGuide.statusListening
                : isSpeechSupported
                  ? t.aiGuide.statusIdleSupported
                  : t.aiGuide.statusUnsupported)}
          </p>

          <p className={cn("mb-1.5 text-[0.625rem] font-bold tracking-[0.12em] text-muted-foreground", largeText && "text-xs")}>
            {t.aiGuide.expectedQuestionsLabel}
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {t.aiGuide.expectedQuestions.map(({ key, label }) => {
              const Icon = QUESTION_ICON[key as keyof typeof QUESTION_ICON];
              return (
                <button
                  key={key}
                  type="button"
                  disabled={isTyping}
                  onClick={() => handleAsk(label)}
                  className={cn(
                    "flex min-h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border border-white/55 bg-white/72 px-3 py-1.5 text-left text-[0.6875rem] font-semibold text-foreground shadow-sm backdrop-blur-md transition hover:border-primary/40 hover:bg-white/90 disabled:opacity-50 dark:border-white/10 dark:bg-slate-900/68",
                    largeText && "text-sm",
                  )}
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="size-3.5" />
                  </span>
                  <span className="leading-tight">{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      {voiceGuide && <span className="sr-only" aria-live="polite">{t.aiGuide.voiceGuideOnAnnouncement}</span>}
    </section>
  );
}
