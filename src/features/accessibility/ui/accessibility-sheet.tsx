"use client";

import { MonitorSmartphone, QrCode } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
  SheetFooter,
} from "@/shared/ui/sheet";
import { useAccessibilityStore } from "../model/store";
import type { AccessibilityLanguage } from "@/entities/visitor";

const LANGUAGES: AccessibilityLanguage[] = ["한국어", "English", "中文", "日本語"];

function AccessibilityIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <circle cx="12" cy="4" r="2" />
      <path d="M19 13v-2c-1.54.02-3.09-.75-4.07-1.83l-1.29-1.43c-.17-.19-.38-.34-.61-.45-.01 0-.01-.01-.02-.01H13c-.35-.2-.75-.3-1.19-.26C10.76 7.11 10 8.04 10 9.09V15c0 1.1.9 2 2 2h5v5h2v-5.5c0-1.1-.9-2-2-2h-3v-3.45c1.29 1.07 3.25 1.94 5 1.95zm-6.17 5c-.41 1.16-1.52 2-2.83 2-1.66 0-3-1.34-3-3 0-1.31.84-2.41 2-2.83V12.1c-2.28.46-4 2.48-4 4.9 0 2.76 2.24 5 5 5 2.42 0 4.44-1.72 4.9-4h-2.07z" />
    </svg>
  );
}

export function AccessibilitySheet({ triggerClassName }: { triggerClassName?: string } = {}) {
  const {
    language,
    largeText,
    voiceGuide,
    visitorMode,
    setLanguage,
    setVisitorMode,
    toggleLargeText,
    toggleVoiceGuide,
  } = useAccessibilityStore();
  const kioskMode = visitorMode === "kiosk";

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            className={cn("rounded-full", triggerClassName)}
            aria-label="접근성 설정"
          />
        }
      >
        <AccessibilityIcon className="size-5" />
      </SheetTrigger>
      <SheetContent side="bottom" className="mx-auto max-w-md rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>이용 환경 및 접근성</SheetTitle>
          <SheetDescription>
            기기 이용 방식과 언어, 글씨 크기, 음성 안내를 설정할 수 있어요.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-5 px-4">
          <section className="space-y-2.5" aria-labelledby="visitor-mode-label">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label id="visitor-mode-label" htmlFor="kiosk-mode" className="text-sm font-semibold">
                  키오스크 간편 모드
                </Label>
                <p className="text-xs text-muted-foreground">홈, AI 안내, 지도만 표시해요</p>
              </div>
              <Switch
                id="kiosk-mode"
                checked={kioskMode}
                onCheckedChange={(checked) => setVisitorMode(checked ? "kiosk" : "qr")}
              />
            </div>
            <div className="grid grid-cols-2 gap-2" aria-live="polite">
              <div
                className={cn(
                  "rounded-xl border p-3 transition-colors",
                  !kioskMode ? "border-primary bg-primary/5" : "border-border bg-background",
                )}
              >
                <QrCode className={cn("mb-2 size-5", !kioskMode ? "text-primary" : "text-muted-foreground")} />
                <p className="text-sm font-semibold">QR 모드</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">전체 축제 기능 제공</p>
              </div>
              <div
                className={cn(
                  "rounded-xl border p-3 transition-colors",
                  kioskMode ? "border-primary bg-primary/5" : "border-border bg-background",
                )}
              >
                <MonitorSmartphone
                  className={cn("mb-2 size-5", kioskMode ? "text-primary" : "text-muted-foreground")}
                />
                <p className="text-sm font-semibold">키오스크 모드</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">핵심 기능만 간편 제공</p>
              </div>
            </div>
          </section>

          <div>
            <Label className="mb-2 block text-sm font-semibold">언어 선택</Label>
            <div className="grid grid-cols-4 gap-2">
              {LANGUAGES.map((lng) => (
                <button
                  type="button"
                  key={lng}
                  onClick={() => setLanguage(lng)}
                  className={cn(
                    "rounded-lg border px-2 py-2 text-xs font-medium transition-colors",
                    language === lng
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground hover:bg-accent",
                  )}
                >
                  {lng}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border p-3">
            <div>
              <Label htmlFor="large-text" className="text-sm font-semibold">큰 글씨 모드</Label>
              <p className="text-xs text-muted-foreground">텍스트를 더 크고 굵게 표시해요</p>
            </div>
            <Switch id="large-text" checked={largeText} onCheckedChange={toggleLargeText} />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border p-3">
            <div>
              <Label htmlFor="voice-guide" className="text-sm font-semibold">음성 안내</Label>
              <p className="text-xs text-muted-foreground">AI 축제 안내를 음성으로 들려드려요</p>
            </div>
            <Switch id="voice-guide" checked={voiceGuide} onCheckedChange={toggleVoiceGuide} />
          </div>
        </div>
        <SheetFooter>
          <p className="text-center text-[11px] text-muted-foreground">
            설정은 이 기기에 자동 저장되며 다음 방문 시에도 유지돼요.
          </p>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
