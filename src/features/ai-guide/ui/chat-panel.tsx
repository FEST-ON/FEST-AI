"use client";

import { useRef, useEffect } from "react";
import { Sparkles, Volume2, RotateCcw, MapPin, Car, Bus, Users, ShieldCheck, CalendarDays, Compass, Recycle } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/utils";
import { useChatStore } from "../model/chat-store";
import { buildMessage, generateReply } from "../lib/generate-reply";
import { useAccessibilityStore } from "@/features/accessibility/model/store";

const FAQ_ITEMS = [
  { icon: Users, label: "지금 어디가 가장 혼잡한가요?" },
  { icon: Car, label: "주차장 이용 안내해줘" },
  { icon: Bus, label: "셔틀버스는 어떻게 타나요?" },
  { icon: MapPin, label: "화장실은 어디에 있나요?" },
  { icon: ShieldCheck, label: "안전 요원은 어디 있나요?" },
  { icon: CalendarDays, label: "오늘 프로그램 알려줘" },
  { icon: Compass, label: "가족과 함께 코스 추천해줘" },
  { icon: Recycle, label: "다회용기는 어디서 반납하나요?" },
] as const;

export function ChatPanel() {
  const { messages, isTyping, addMessage, setTyping, reset } = useChatStore();
  const { voiceGuide, largeText } = useAccessibilityStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  async function handleAsk(text: string) {
    if (isTyping) return;
    addMessage(buildMessage("user", text));
    setTyping(true);
    try {
      const { content, sources } = await generateReply(text);
      addMessage(buildMessage("assistant", content, sources));
    } catch (error) {
      addMessage(buildMessage("assistant", error instanceof Error ? error.message : "답변을 불러오지 못했습니다."));
    } finally {
      setTyping(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center gap-1.5 px-4 pb-2">
        <Badge variant="secondary" className="gap-1 text-[10px]">
          <Sparkles className="size-3 text-primary" /> 승인 콘텐츠 기반 AI
        </Badge>
        <Badge variant="outline" className="text-[10px] text-muted-foreground">백엔드 실시간 연동</Badge>
        {voiceGuide && (
          <Badge variant="outline" className="gap-1 text-[10px] text-muted-foreground">
            <Volume2 className="size-3" /> 음성안내 ON
          </Badge>
        )}
        <button
          onClick={reset}
          className="ml-auto inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-accent"
        >
          <RotateCcw className="size-3" /> 처음으로
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-3">
        {messages.map((m) => (
          <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line",
                largeText && "text-base leading-loose",
                m.role === "user"
                  ? "rounded-br-sm bg-primary text-primary-foreground"
                  : "rounded-bl-sm bg-muted text-foreground",
              )}
            >
              {m.content}
              {m.sources && m.sources.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1 border-t border-black/10 pt-1.5 dark:border-white/10">
                  {m.sources.map((s) => (
                    <span key={s} className="text-[10px] opacity-70">
                      출처: {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-muted px-4 py-3">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60"
                  style={{ animationDelay: `${i * 120}ms` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border px-4 py-3">
        <p className="mb-2 text-[11px] font-semibold text-muted-foreground">자주 묻는 질문</p>
        <div className="grid grid-cols-2 gap-2">
          {FAQ_ITEMS.map(({ icon: Icon, label }) => (
            <button
              key={label}
              onClick={() => handleAsk(label)}
              disabled={isTyping}
              className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-3 text-left text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-primary dark:bg-blue-950">
                <Icon className="size-3.5" />
              </span>
              <span className="leading-tight">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
