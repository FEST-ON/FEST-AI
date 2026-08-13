import Link from "next/link";
import {
  Sparkles,
  LayoutDashboard,
  QrCode,
  Leaf,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { Logo } from "@/shared/ui/logo";
import { Badge } from "@/shared/ui/badge";
import { festivalInfo } from "@/entities/festival";

const FEATURES = [
  {
    icon: Sparkles,
    title: "AI 축제 안내",
    desc: "일정·교통·시설·안전 정보를 자연어로 안내하고, 동행유형·관심사 기반 맞춤 코스를 추천해요.",
  },
  {
    icon: LayoutDashboard,
    title: "통합 운영관리",
    desc: "프로그램·업체·부스·인력·자원봉사자를 한 화면에서, 민원·사고는 티켓으로 관리해요.",
  },
  {
    icon: QrCode,
    title: "방문객 QR 모바일 웹",
    desc: "앱 설치 없이 지도·예약·대기표·스탬프투어·디지털 쿠폰까지 한 번에 이용해요.",
  },
  {
    icon: Leaf,
    title: "ESG 성과관리",
    desc: "다회용기·분리배출·대중교통 데이터를 자동 집계하고 ESG 보고서 초안을 생성해요.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-background">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex w-full items-center justify-between gap-2">
          <Logo />
          <Link
            href="/admin"
            title="운영자 로그인"
            aria-label="운영자 로그인"
            className="rounded-full size-10 text-muted-foreground/50 transition-colors hover:text-muted-foreground"
          >
            {/* <Lock className="size-3.5" /> */}
          </Link>
        </div>
        <Badge variant="secondary" className="hidden gap-1.5 sm:inline-flex">
          <ShieldCheck className="size-3.5" />
          {festivalInfo.organizer} 공식 데모
        </Badge>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-16 pt-6 lg:pt-10 items-center justify-center">
        <section className="lg:text-center">
          <div className="flex flex-col gap-5 lg:items-center">
            <p className="inline-flex w-fit items-center gap-1.5 text-md font-bold uppercase tracking-[0.1em] text-primary ">
              <Sparkles className="size-3.5" />
              AI · ESG 기반 지역축제 DX 플랫폼
            </p>
            <h1 className="max-w-xl text-4xl font-extrabold leading-[1.15] tracking-tight text-foreground sm:text-5xl">
              축제 운영의 신뢰를 잇는,
              <br />
              <span className="text-primary">FESTAI</span>
            </h1>
          </div>
        </section>
        <section className="mt-12 rounded-2xl border border-border bg-primary p-8 text-primary-foreground sm:p-10 lg:mt-16">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-primary-foreground/70">
                {festivalInfo.period.start} ~ {festivalInfo.period.end}
              </p>
              <h2 className="mt-2 text-2xl font-bold">{festivalInfo.name}</h2>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-primary-foreground/80">
                {festivalInfo.description}
              </p>
            </div>
            <Link
              href="/visitor"
              className="group inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-background px-5 py-3 text-sm font-bold text-primary transition-colors hover:bg-background/90"
            >
              방문객으로 둘러보기
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © 2026 F:EST AI. All rights reserved.
      </footer>
    </div>
  );
}
