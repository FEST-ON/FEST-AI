"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { ComplaintSheet } from "@/features/complaint";
import { AccessibilitySheet } from "@/features/accessibility/ui/accessibility-sheet";
import { NotificationSheet } from "@/features/notification/ui/notification-sheet";
import { AreaSheet } from "@/features/visitor-area/ui/area-sheet";
import { useTranslation } from "@/shared/lib/i18n";
import { Logo } from "@/shared/ui/logo";
import { NAV_ITEMS } from "./visitor-nav";

export function VisitorTopbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation();
  // 하단 탭에 없는 화면(스탬프투어·설문·상권 등)은 돌아갈 길이 브라우저 뒤로가기뿐이었다.
  const showBack = !NAV_ITEMS.some((item) => item.href === pathname);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex max-w-md items-center justify-between gap-1 px-3 py-1.5">
        <div className="flex min-w-0 items-center gap-1">
          {showBack && (
            <button
              type="button"
              onClick={() => router.back()}
              aria-label={t.common.back}
              className="-ml-1 flex size-11 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-muted"
            >
              <ChevronLeft className="size-5" />
            </button>
          )}
          <Link href="/visitor" className="shrink-0">
            <Logo />
          </Link>
        </div>

        <div className="flex items-center">
          <AreaSheet />
          <AccessibilitySheet showLabel />
          <ComplaintSheet />
          <NotificationSheet />
        </div>
      </div>
    </header>
  );
}
