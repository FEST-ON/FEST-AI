"use client";

import Link from "next/link";
import { Logo } from "@/shared/ui/logo";
import { BackButton } from "@/shared/ui/back-button";
import { AccessibilitySheet } from "@/features/accessibility/ui/accessibility-sheet";
import { ComplaintSheet } from "@/features/complaint/ui/complaint-sheet";

export function VisitorTopbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <BackButton />
          <Link href="/visitor">
            <Logo />
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <AccessibilitySheet />
          <ComplaintSheet />
        </div>
      </div>
    </header>
  );
}
