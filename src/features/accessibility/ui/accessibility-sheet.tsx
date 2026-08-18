"use client";

import { MonitorSmartphone, QrCode } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";
import { iconTileClass, iconTileLabelClass } from "@/shared/ui/icon-tile";
import { WheelchairIcon } from "@/shared/ui/wheelchair-icon";
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
            className={cn(
              showLabel ? iconTileClass : "rounded-full",
              triggerClassName,
            )}
            aria-label={t.accessibility.ariaLabel}
          />
        }
      >
        <WheelchairIcon className={showLabel ? "size-5" : "size-4"} />
        {showLabel && (
          <span className={iconTileLabelClass}>
            {t.accessibility.shortLabel}
          </span>
        )}
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
                <p className="text-sm font-semibold">
                  {t.accessibility.qrTitle}
                </p>
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
                <p className="text-sm font-semibold">
                  {t.accessibility.kioskModeTitle}
                </p>
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
