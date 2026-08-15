"use client";

import { LANGUAGE_BY_LOCALE } from "@/shared/lib/i18n";
import { cn } from "@/shared/lib/utils";
import { useAccessibilityStore } from "../model/store";
import { useFestivalLanguages } from "../model/use-festival-languages";

/** 축제가 지원하는 언어 버튼. 접근성 시트와 키오스크 진입 화면이 같은 목록을 쓴다(AI-05). */
export function LanguageBar({ className, buttonClassName }: { className?: string; buttonClassName?: string }) {
  const { languages } = useFestivalLanguages();
  const language = useAccessibilityStore((state) => state.language);
  const setLanguage = useAccessibilityStore((state) => state.setLanguage);

  return (
    <div
      className={cn("grid gap-2", className)}
      style={{ gridTemplateColumns: `repeat(${languages.length}, minmax(0, 1fr))` }}
    >
      {languages.map((locale) => {
        const label = LANGUAGE_BY_LOCALE[locale];
        return (
          <button
            type="button"
            key={locale}
            lang={locale}
            aria-pressed={language === label}
            onClick={() => setLanguage(label)}
            className={cn(
              "rounded-lg border px-2 py-2 text-xs font-medium transition-colors",
              language === label
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-foreground hover:bg-accent",
              buttonClassName,
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
