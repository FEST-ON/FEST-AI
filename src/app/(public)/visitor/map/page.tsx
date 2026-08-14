"use client";

import { useQuery } from "@tanstack/react-query";
import { Bus, Car, TrainFront } from "lucide-react";
import { fetchFacilities, fetchTransport } from "@/entities/festival";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Badge } from "@/shared/ui/badge";
import { Skeleton } from "@/shared/ui/skeleton";
import { FestivalMap } from "@/features/map/ui/festival-map";

const TRANSPORT_ICON = {
  지하철: TrainFront,
  버스: Bus,
  셔틀: Bus,
  주차: Car,
} as const;

const STATUS_STYLE = {
  원활: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  보통: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  혼잡: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
  지연: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
} as const;

export default function VisitorMapPage() {
  const { data: facilities, isLoading: fLoading } = useQuery({
    queryKey: ["facilities"],
    queryFn: fetchFacilities,
  });
  const { data: transport, isLoading: tLoading } = useQuery({
    queryKey: ["transport"],
    queryFn: fetchTransport,
  });

  return (
    <div className="px-4 pt-4 pb-6">
      <h1 className="text-lg font-extrabold text-foreground">
        디지털 지도 · 시설정보
      </h1>
      <p className="text-xs text-muted-foreground">
        등록된 축제 부스와 편의시설, 교통정보를 확인하세요
      </p>

      <FestivalMap />

      <Tabs defaultValue="facility" className="mt-4">
        <TabsList className="grid grid-cols-2">
          <TabsTrigger value="facility">편의시설</TabsTrigger>
          <TabsTrigger value="transport">교통</TabsTrigger>
        </TabsList>

        <TabsContent value="facility" className="mt-3 space-y-2">
          {fLoading || !facilities ? (
            <Skeleton className="h-40 w-full rounded-xl" />
          ) : (
            facilities.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-3"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {f.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{f.location}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant="outline" className="text-[10px]">
                    {f.type}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">
                    도보 {f.walkMinutes}분
                  </span>
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="transport" className="mt-3 space-y-2">
          {tLoading || !transport ? (
            <Skeleton className="h-40 w-full rounded-xl" />
          ) : (
            transport.map((t) => {
              const Icon = TRANSPORT_ICON[t.mode];
              return (
                <div
                  key={t.id}
                  className="flex items-start gap-3 rounded-xl border border-border bg-card p-3"
                >
                  <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-primary dark:bg-blue-950">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      {t.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{t.detail}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[t.status]}`}
                  >
                    {t.status}
                  </span>
                </div>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
