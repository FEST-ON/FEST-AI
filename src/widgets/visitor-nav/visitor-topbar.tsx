"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useAccessibilityStore } from "@/features/accessibility/model/store";
import { useVisitorMenuSettingsStore } from "@/features/visitor-menu-settings/model/store";
import { ComplaintSheet } from "@/features/complaint/ui/complaint-sheet";
import { AccessibilitySheet } from "@/features/accessibility/ui/accessibility-sheet";
import { Logo } from "@/shared/ui/logo";

export function VisitorTopbar() {
  const visitorMode = useAccessibilityStore((state) => state.visitorMode);
  const surveyEnabled = useVisitorMenuSettingsStore((state) => state.survey);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
        <Link href="/visitor">
          <Logo />
        </Link>

        <div className="flex items-center gap-2">
          <AccessibilitySheet />
          <ComplaintSheet />

          {visitorMode === "qr" && surveyEnabled && (
            <Link
              href="/visitor/survey"
              className="relative inline-flex size-9 items-center justify-center rounded-full border border-border bg-background text-foreground hover:bg-accent"
              aria-label="긴급 공지"
            >
              <Bell className="size-4" />
              <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-destructive" />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}