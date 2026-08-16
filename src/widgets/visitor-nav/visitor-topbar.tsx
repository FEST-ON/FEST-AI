"use client";

import Link from "next/link";
import { ComplaintSheet } from "@/features/complaint";
import { AccessibilitySheet } from "@/features/accessibility/ui/accessibility-sheet";
import { NotificationSheet } from "@/features/notification/ui/notification-sheet";
import { Logo } from "@/shared/ui/logo";

export function VisitorTopbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
        <Link href="/visitor">
          <Logo />
        </Link>

        <div className="flex items-center gap-2">
          <AccessibilitySheet />
          <ComplaintSheet />
          <NotificationSheet />
        </div>
      </div>
    </header>
  );
}
