"use client";

import { ALargeSmall, Contrast, Volume2 } from "lucide-react";
import { recordKioskAssist } from "@/features/kiosk-age-assist/api/kiosk-assist";
import { useTranslation } from "@/shared/lib/i18n";
import { cn } from "@/shared/lib/utils";
import { useAccessibilityStore } from "../model/store";
import { LanguageBar } from "./language-bar";

/**
 * 키오스크에서는 "설정 아이콘을 눌러 시트를 연다"는 흐름이 통하지 않는다 — 처음 보는 기기 앞에
 * 잠깐 서는 사람이 대부분이라, 언어와 글씨 크기는 화면에 늘 보이는 자리에서 한 번에 바뀌어야 한다.
 * ponytail: 저장 상태는 접근성 시트와 같은 스토어를 그대로 쓴다. 여기는 표시만 다르다.
 */
export function KioskSettingsBar() {
  const { t } = useTranslation();
  const {
    largeText,
    highContrast,
    voiceGuide,
    toggleLargeText,
    toggleHighContrast,
    toggleVoiceGuide,
  } = useAccessibilityStore();

  // 카메라 제안을 중지해도 수동 전환만으로 접근성 이용이 유지되는지 확인해야 한다(ESG-G-08).
  // 켜는 순간만 센다 — 껐다 켰다를 모두 세면 수동 전환율이 부풀려진다.
  const manualLargeText = () => {
    if (!largeText) void recordKioskAssist("MANUAL_LARGE_TEXT");
    toggleLargeText();
  };

  const toggles = [
    { key: "largeText", icon: ALargeSmall, label: t.accessibility.largeTextLabel, on: largeText, onClick: manualLargeText },
    { key: "highContrast", icon: Contrast, label: t.accessibility.highContrastLabel, on: highContrast, onClick: toggleHighContrast },
    { key: "voiceGuide", icon: Volume2, label: t.accessibility.voiceGuideLabel, on: voiceGuide, onClick: toggleVoiceGuide },
  ];

  return (
    <div className="border-t border-border bg-card">
      <div className="mx-auto flex max-w-md flex-col gap-2 px-3 py-2">
        <LanguageBar buttonClassName="min-h-12 text-sm font-semibold" />
        <div className="grid grid-cols-3 gap-2">
          {toggles.map(({ key, icon: Icon, label, on, onClick }) => (
            <button
              key={key}
              type="button"
              aria-pressed={on}
              onClick={onClick}
              className={cn(
                "flex min-h-12 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-center text-xs font-semibold leading-tight transition-colors",
                on
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:bg-accent",
              )}
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
