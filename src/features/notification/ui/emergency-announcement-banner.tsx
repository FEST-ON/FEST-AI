"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, X } from "lucide-react";
import { announcementText, fetchAnnouncements, isEmergency, visibleAnnouncements } from "@/features/notification/api/notifications";
import { useAutoTranslate, useTranslation } from "@/shared/lib/i18n";
import { useNow } from "@/shared/lib/use-now";

// 방문객은 종 아이콘 시트를 직접 열어야만 공지를 봤다 — 긴급(EMERGENCY) 공지는 그걸로 부족해서
// 시트를 열지 않아도, AI 안내(immersive) 화면에서도 바로 보이는 배너로 별도 노출한다.
export function EmergencyAnnouncementBanner() {
  const { t, locale } = useTranslation();
  const notices = useQuery({ queryKey: ["public-announcements"], queryFn: fetchAnnouncements, refetchInterval: 30_000 });
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  // 자동 해제 시각이 지나면 재조회를 기다리지 않고 배너를 내린다.
  const now = useNow(30_000);

  const emergencyNotices = visibleAnnouncements(notices.data, now)
    .filter((notice) => isEmergency(notice) && !dismissedIds.includes(notice.id));

  const { translated } = useAutoTranslate(
    Object.fromEntries(emergencyNotices.flatMap((notice) => [
      [`${notice.id}.title`, notice.title],
      [`${notice.id}.body`, announcementText(notice.body)],
    ])),
    locale,
  );

  if (emergencyNotices.length === 0) return null;

  return (
    <div className="sticky top-0 z-40 flex flex-col divide-y divide-red-200 border-b border-red-200 bg-red-50 dark:divide-red-900 dark:border-red-900 dark:bg-red-950/40">
      {emergencyNotices.map((notice) => (
        <div key={notice.id} className="flex items-start gap-2.5 px-4 py-2.5 text-red-800 dark:text-red-200">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wide">{t.notification.emergencyBadge}</p>
            <p className="mt-0.5 text-sm font-semibold">{translated[`${notice.id}.title`] ?? notice.title}</p>
            <p className="mt-0.5 text-xs leading-5 opacity-90">
              {translated[`${notice.id}.body`] ?? announcementText(notice.body)}
            </p>
          </div>
          <button
            type="button"
            aria-label={t.notification.emergencyDismissAria}
            onClick={() => setDismissedIds((current) => [...current, notice.id])}
            className="shrink-0 rounded-full p-1 hover:bg-red-200/60 dark:hover:bg-red-900/60"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
