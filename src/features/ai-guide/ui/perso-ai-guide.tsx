"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Bus,
  CalendarDays,
  CheckCircle2,
  Flag,
  Keyboard,
  MapPin,
  Mic,
  RotateCcw,
  SendHorizontal,
  Square,
  Sparkles,
  Users,
  Volume2,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { AccessibilitySheet } from "@/features/accessibility/ui/accessibility-sheet";
import { useAccessibilityStore } from "@/features/accessibility/model/store";
import { useTranslation } from "@/shared/lib/i18n";
import { buildMessage, generateReply, reportAiMessage, resetConversation } from "../lib/generate-reply";
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
  const { messages, isTyping, addMessage, setTyping, reset, syncWelcome } = useChatStore();
  const { largeText, voiceGuide } = useAccessibilityStore();
  const [draft, setDraft] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);
  const [reportStatus, setReportStatus] = useState<"idle" | "pending" | "done" | "error">("idle");

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

  const latestAssistantMessage = [...messages].reverse().find((message) => message.role === "assistant");
  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");

  const estimatedConversationHeight = messages.slice(-3).reduce((height, message) => {
    const charactersPerLine = largeText ? 27 : 38;
    const lineHeight = largeText ? 26 : 20;
    return height + 34 + Math.ceil(message.content.length / charactersPerLine) * lineHeight;
  }, 0);
  const chatPanelHeight = showTextInput
    ? Math.min(470, Math.max(400, 290 + estimatedConversationHeight))
    : Math.min(450, Math.max(340, 240 + estimatedConversationHeight));

  const handleAsk = useCallback(async (question: string) => {
    if (isTyping) return;

    addMessage(buildMessage("user", question, locale));
    setTyping(true);
    setReportStatus("idle");

    try {
      const reply = await generateReply(question, locale);
      addMessage(buildMessage("assistant", reply.content, locale, { sources: reply.sources, backendMessageId: reply.messageId }));
    } catch {
      addMessage(buildMessage("assistant", t.aiGuide.replyFailed, locale));
    } finally {
      setTyping(false);
    }
  }, [addMessage, isTyping, setTyping, t, locale]);

  const handleVoiceResult = useCallback((transcript: string) => {
    void handleAsk(transcript);
  }, [handleAsk]);

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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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

      <div className="absolute left-1/2 top-4 z-30 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-white/20 bg-slate-950/45 px-3 py-2 text-[11px] font-semibold text-white/90 backdrop-blur-md">
        <Volume2 className="size-3.5 text-cyan-300" />
        {t.aiGuide.voiceReadyBadge}
      </div>

      <div className="absolute right-4 top-4 z-30 flex items-center gap-2">
        <AccessibilitySheet triggerClassName="size-10 border-white/20 bg-slate-950/40 text-white backdrop-blur-md hover:bg-slate-950/60 hover:text-white" />
        <button
          type="button"
          aria-label={t.aiGuide.resetAria}
          onClick={() => { resetConversation(); reset(welcomeMessage); setReportStatus("idle"); }}
          className="flex size-10 items-center justify-center rounded-full border border-white/20 bg-slate-950/40 text-white backdrop-blur-md transition hover:bg-slate-950/60"
        >
          <RotateCcw className="size-4" />
        </button>
      </div>

      <div
        className="absolute inset-x-0 bottom-0 z-10 flex flex-col overflow-hidden rounded-t-[30px] border-t border-white/45 bg-white/70 text-foreground shadow-[0_-18px_52px_rgba(15,23,42,0.38)] backdrop-blur-xl transition-[height] duration-300 ease-out dark:bg-slate-950/68"
        style={{ height: chatPanelHeight }}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-12 bg-linear-to-b from-white/90 via-white/40 to-transparent dark:from-slate-950/85 dark:via-slate-950/35" />

        <div
          className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-3 pt-8"
          style={{
            maskImage: "linear-gradient(to bottom, transparent 0, black 36px, black 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0, black 36px, black 100%)",
          }}
        >
          {latestUserMessage && (
            <p className="text-center text-[10px] font-semibold text-slate-700/75 dark:text-white/65">
              {t.aiGuide.recognizedQuestionPrefix}“{latestUserMessage.content}”
            </p>
          )}

          {latestAssistantMessage && (
            <div className="rounded-2xl border border-white/55 bg-white/78 px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-line text-card-foreground shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-slate-900/72">
              <span className="mb-1 flex items-center gap-1 text-[10px] font-bold text-primary">
                <Sparkles className="size-3" /> {t.aiGuide.assistantLabel}
              </span>
              {latestAssistantMessage.content}
              {latestAssistantMessage.sources && latestAssistantMessage.sources.length > 0 && (
                <p className="mt-1.5 border-t border-border/70 pt-1.5 text-[9px] opacity-60">
                  {t.aiGuide.sourcePrefix}{latestAssistantMessage.sources.join(", ")}
                </p>
              )}
              {latestAssistantMessage.backendMessageId && (
                <div className="mt-2 flex items-center justify-end border-t border-border/70 pt-2">
                  <button
                    type="button"
                    onClick={() => void reportLatestAnswer()}
                    disabled={reportStatus === "pending" || reportStatus === "done"}
                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground disabled:opacity-60"
                  >
                    {reportStatus === "done" ? <CheckCircle2 className="size-3" /> : <Flag className="size-3" />}
                    {reportStatus === "pending" ? t.aiGuide.reportPending : reportStatus === "done" ? t.aiGuide.reportDone : t.aiGuide.reportAction}
                  </button>
                </div>
              )}
              {reportStatus === "error" && <p className="mt-1 text-right text-[9px] text-red-600">{t.aiGuide.reportFailed}</p>}
            </div>
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
                  aria-label={showTextInput ? t.aiGuide.keyboardCloseAria : t.aiGuide.keyboardOpenAria}
                  aria-expanded={showTextInput}
                  aria-controls="perso-text-question"
                  className={cn(
                    "flex size-13 shrink-0 items-center justify-center rounded-full border-2 border-white/75 shadow-sm backdrop-blur-md transition active:scale-95 disabled:opacity-40",
                    showTextInput
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                      : "bg-white/82 text-slate-700 hover:bg-white dark:bg-slate-900/78 dark:text-white",
                  )}
                >
                  <Keyboard className="size-5" />
                </button>
              </div>
            </div>

            <p className="mt-1.5 min-h-4 text-center text-[10px] font-semibold text-foreground/80">
              {isListening ? interimTranscript || t.aiGuide.listeningPlaceholder : t.aiGuide.idlePrompt}
            </p>

            {showTextInput && (
              <form
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
                  className="min-w-0 flex-1 bg-transparent px-2 text-[12px] font-medium text-foreground outline-none placeholder:text-muted-foreground/75"
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || isTyping}
                  aria-label={t.aiGuide.sendAria}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <SendHorizontal className="size-4" />
                </button>
              </form>
            )}
          </div>

          <p
            aria-live="polite"
            className={cn(
              "min-h-4 px-1 pt-1 text-[9px] font-medium text-muted-foreground",
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

          <p className={cn("mb-1.5 text-[10px] font-bold tracking-[0.12em] text-muted-foreground", largeText && "text-xs")}>
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
                    "flex min-h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border border-white/55 bg-white/72 px-3 py-1.5 text-left text-[11px] font-semibold text-foreground shadow-sm backdrop-blur-md transition hover:border-primary/40 hover:bg-white/90 disabled:opacity-50 dark:border-white/10 dark:bg-slate-900/68",
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
