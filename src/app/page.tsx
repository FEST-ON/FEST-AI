import Link from "next/link";
import { ShieldCheck, Sparkles } from "lucide-react";
import { Logo } from "@/shared/ui/logo";
import { Badge } from "@/shared/ui/badge";
import { festivalInfo } from "@/entities/festival";
import { FestivalHero } from "@/widgets/landing-hero/festival-hero";

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
            <p className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold uppercase tracking-[0.1em] text-primary">
              <Sparkles className="size-3.5" />
              AI · ESG 기반 지역축제 DX 플랫폼
            </p>
            <h1 className="max-w-xl text-[40px] font-semibold leading-[1.07] tracking-[-0.022em] text-foreground sm:text-[56px]">
              축제 운영의 신뢰를 잇는,
              <br />
              <span className="text-primary">FESTAI</span>
            </h1>
          </div>
        </section>
        <FestivalHero />
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © 2026 F:EST AI. All rights reserved.
      </footer>
    </div>
  );
}
