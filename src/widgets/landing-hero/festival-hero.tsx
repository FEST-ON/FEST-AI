"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { fetchLandingFestival, festivalInfo } from "@/entities/festival";

/**
 * 랜딩 히어로. 축제 정보는 백엔드에서 읽고, 조회에 실패하면 정적 안내로 떨어진다.
 * ponytail: 프록시(`/api/backend`)가 상대 경로라 서버 렌더에서는 못 부른다 — 클라이언트에서 읽는다.
 */
export function FestivalHero() {
  const { data = festivalInfo } = useQuery({
    queryKey: ["landing-festival"],
    queryFn: fetchLandingFestival,
    staleTime: 5 * 60_000,
  });

  return (
    <section className="mt-12 rounded-2xl bg-primary p-8 text-primary-foreground sm:p-10 lg:mt-16">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-primary-foreground/70">
            {data.period.start} ~ {data.period.end}
          </p>
          <h2 className="mt-2 text-2xl font-semibold">{data.name}</h2>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-primary-foreground/80">{data.description}</p>
        </div>
        <Link
          href="/visitor"
          className="group inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-background px-6 py-3 text-sm font-medium text-primary transition-transform hover:bg-background/90 active:scale-95"
        >
          방문객으로 둘러보기
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </section>
  );
}
