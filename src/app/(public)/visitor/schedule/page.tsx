"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchSchedule } from "@/entities/festival";
import { useTranslation } from "@/shared/lib/i18n";
import { Badge } from "@/shared/ui/badge";
import { Skeleton } from "@/shared/ui/skeleton";

const CATEGORY_STYLE: Record<string, string> = {
  공연: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  체험: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  전시: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
  푸드: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  행사: "bg-pink-100 text-pink-700 dark:bg-pink-950/50 dark:text-pink-300",
};

export default function SchedulePage() {
  const { t, locale } = useTranslation();
  const { data: schedule, isLoading } = useQuery({
    queryKey: ["schedule", locale] as const,
    queryFn: () => fetchSchedule(locale),
  });

  const grouped = (schedule ?? []).reduce<Record<string, typeof schedule>>((acc, item) => {
    acc[item.day] = [...(acc[item.day] ?? []), item];
    return acc;
  }, {});

  return (
    <div className="px-4 pt-4 pb-6">
      <h1 className="text-lg font-extrabold text-foreground">{t.schedule.title}</h1>
      <p className="text-xs text-muted-foreground">{t.schedule.subtitle}</p>

      {isLoading || !schedule ? (
        <div className="mt-4 space-y-2.5">
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      ) : (
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
    </div>
  );
}
