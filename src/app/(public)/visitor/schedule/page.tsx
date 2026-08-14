"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchSchedule } from "@/entities/festival";
import { useTranslation } from "@/shared/lib/i18n";
import { Badge } from "@/shared/ui/badge";
import { QueryState } from "@/shared/ui/query-state";
import { SkeletonList } from "@/shared/ui/skeleton";
import { TONE } from "@/shared/ui/status-pill";

const CATEGORY_STYLE: Record<string, string> = {
  공연: TONE.accent, 체험: TONE.success, 전시: TONE.plain, 푸드: TONE.warning, 행사: TONE.pink,
};

export default function SchedulePage() {
  const { t, locale } = useTranslation();
  const scheduleQuery = useQuery({
    queryKey: ["schedule", locale] as const,
    queryFn: () => fetchSchedule(locale),
  });
  const schedule = scheduleQuery.data;

  const grouped = (schedule ?? []).reduce<Record<string, typeof schedule>>((acc, item) => {
    acc[item.day] = [...(acc[item.day] ?? []), item];
    return acc;
  }, {});

  return (
    <div className="px-4 pt-4 pb-6">
      <h1 className="text-lg font-extrabold text-foreground">{t.schedule.title}</h1>
      <p className="text-xs text-muted-foreground">{t.schedule.subtitle}</p>

      <QueryState
        query={scheduleQuery}
        className="mt-4"
        skeleton={<SkeletonList count={3} className="h-14 w-full rounded-xl" wrapperClassName="mt-4 space-y-2.5" />}
        errorMessage={t.common.loadFailed}
        retryLabel={t.common.retry}
        empty={t.common.empty}
      >
        {() => (
          <div className="mt-4 space-y-5">
            {Object.entries(grouped).map(([day, items]) => (
              <div key={day}>
                <h2 className="mb-2 text-sm font-bold text-primary">{day}</h2>
                <div className="space-y-2">
                  {items!.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                      <span className="w-12 shrink-0 text-sm font-bold text-foreground">{item.time}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.stage}</p>
                      </div>
                      <Badge className={`shrink-0 text-[10px] ${CATEGORY_STYLE[item.category]}`}>{t.festivalData.category[item.category]}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </QueryState>
    </div>
  );
}
