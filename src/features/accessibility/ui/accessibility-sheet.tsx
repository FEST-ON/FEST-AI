"use client";

import { MonitorSmartphone, QrCode } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";
import { iconTileClass, iconTileLabelClass } from "@/shared/ui/icon-tile";
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
import { LanguageBar } from "./language-bar";
import { useTranslation } from "@/shared/lib/i18n";

function AccessibilityIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <circle cx="12" cy="4" r="2" />
      <path d="M19 13v-2c-1.54.02-3.09-.75-4.07-1.83l-1.29-1.43c-.17-.19-.38-.34-.61-.45-.01 0-.01-.01-.02-.01H13c-.35-.2-.75-.3-1.19-.26C10.76 7.11 10 8.04 10 9.09V15c0 1.1.9 2 2 2h5v5h2v-5.5c0-1.1-.9-2-2-2h-3v-3.45c1.29 1.07 3.25 1.94 5 1.95zm-6.17 5c-.41 1.16-1.52 2-2.83 2-1.66 0-3-1.34-3-3 0-1.31.84-2.41 2-2.83V12.1c-2.28.46-4 2.48-4 4.9 0 2.76 2.24 5 5 5 2.42 0 4.44-1.72 4.9-4h-2.07z" />
    </svg>
  );
}

export function AccessibilitySheet({
  triggerClassName,
  showLabel = false,
}: { triggerClassName?: string; showLabel?: boolean } = {}) {
  const {
    largeText,
    highContrast,
    voiceGuide,
    visitorMode,
    setVisitorMode,
    toggleLargeText,
    toggleHighContrast,
    toggleVoiceGuide,
  } = useAccessibilityStore();
  const kioskMode = visitorMode === "kiosk";
  const { t } = useTranslation();

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            variant={showLabel ? "ghost" : "outline"}
            size={showLabel ? "default" : "icon"}
            className={cn(showLabel ? iconTileClass : "rounded-full", triggerClassName)}
            aria-label={t.accessibility.ariaLabel}
          />
        }
      >
        <AccessibilityIcon className={showLabel ? "size-5" : "size-4"} />
        {showLabel && <span className={iconTileLabelClass}>{t.accessibility.shortLabel}</span>}
      </SheetTrigger>
      <SheetContent side="bottom" className="mx-auto max-w-md rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>{t.accessibility.sheetTitle}</SheetTitle>
          <SheetDescription>
            {t.accessibility.sheetDescription}
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-5 px-4">
          <div>
            <Label className="mb-2 block text-sm font-semibold">
              {t.accessibility.languageLabel}
            </Label>
            <LanguageBar />
          </div>
          <section className="space-y-2.5" aria-labelledby="visitor-mode-label">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label
                  id="visitor-mode-label"
                  htmlFor="kiosk-mode"
                  className="text-sm font-semibold"
                >
                  {t.accessibility.kioskLabel}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t.accessibility.kioskHelper}
                </p>
              </div>
              <Switch
                id="kiosk-mode"
                checked={kioskMode}
                onCheckedChange={(checked) =>
                  setVisitorMode(checked ? "kiosk" : "qr")
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-2" aria-live="polite">
              <div
                className={cn(
                  "rounded-xl border p-3 transition-colors",
                  !kioskMode
                    ? "border-primary bg-primary/5"
                    : "border-border bg-background",
                )}
              >
                <QrCode
                  className={cn(
                    "mb-2 size-5",
                    !kioskMode ? "text-primary" : "text-muted-foreground",
                  )}
                />
                <p className="text-sm font-semibold">{t.accessibility.qrTitle}</p>
                <p className="mt-0.5 text-[0.6875rem] text-muted-foreground">
                  {t.accessibility.qrSubtitle}
                </p>
              </div>
              <div
                className={cn(
                  "rounded-xl border p-3 transition-colors",
                  kioskMode
                    ? "border-primary bg-primary/5"
                    : "border-border bg-background",
                )}
              >
                <MonitorSmartphone
                  className={cn(
                    "mb-2 size-5",
                    kioskMode ? "text-primary" : "text-muted-foreground",
                  )}
                />
                <p className="text-sm font-semibold">{t.accessibility.kioskModeTitle}</p>
                <p className="mt-0.5 text-[0.6875rem] text-muted-foreground">
                  {t.accessibility.kioskModeSubtitle}
                </p>
              </div>
            </div>
          </section>

          <div className="flex items-center justify-between rounded-xl border border-border p-3">
            <div>
              <Label htmlFor="large-text" className="text-sm font-semibold">
                {t.accessibility.largeTextLabel}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t.accessibility.largeTextHelper}
              </p>
            </div>
            <Switch
              id="large-text"
              checked={largeText}
              onCheckedChange={toggleLargeText}
            />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border p-3">
            <div>
              <Label htmlFor="high-contrast" className="text-sm font-semibold">
                {t.accessibility.highContrastLabel}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t.accessibility.highContrastHelper}
              </p>
            </div>
            <Switch
              id="high-contrast"
              checked={highContrast}
              onCheckedChange={toggleHighContrast}
            />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border p-3">
            <div>
              <Label htmlFor="voice-guide" className="text-sm font-semibold">
                {t.accessibility.voiceGuideLabel}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t.accessibility.voiceGuideHelper}
              </p>
            </div>
            <Switch
              id="voice-guide"
              checked={voiceGuide}
              onCheckedChange={toggleVoiceGuide}
            />
          </div>
        </div>
        <SheetFooter>
          <p className="text-center text-[0.6875rem] text-muted-foreground">
            {t.accessibility.footerNote}
          </p>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
