"use client";

import { useEffect, useState } from "react";
import { QrCode as QrCodeIcon } from "lucide-react";
import { getReusableVisitorCode } from "@/features/reusable-containers";
import { VisitorEsgHeader } from "@/features/esg/ui/visitor-esg-header";
import { useTranslation } from "@/shared/lib/i18n";
import { QrCode } from "@/shared/ui/qr-code";

export default function EsgRentPage() {
  const { t } = useTranslation();
  const [visitorCode, setVisitorCode] = useState("");

  useEffect(() => {
    setVisitorCode(getReusableVisitorCode());
  }, []);

  return (
    <div className="px-4 pt-4 pb-6">
      <VisitorEsgHeader title={t.esg.rent.title} description={t.esg.rent.subtitle} />

      <section className="rounded-2xl border border-esg/30 bg-esg/5 p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-esg-text">
          <QrCodeIcon className="size-4" /> {t.esg.rent.codeLabel}
        </div>
        <div className="mt-4 flex flex-col items-center gap-3 rounded-xl border border-dashed border-esg/40 bg-background p-5">
          {visitorCode && <QrCode value={visitorCode} size={190} alt={t.esg.rent.qrAlt} />}
          <div className="text-center">
            <p className="text-[11px] text-muted-foreground">{t.esg.rent.myCodeLabel}</p>
            <p className="mt-1 font-mono text-lg font-extrabold tracking-widest text-esg-text">{visitorCode || t.esg.rent.codeGenerating}</p>
            <p className="mt-2 text-[11px] leading-4 text-muted-foreground">{t.esg.rent.helper}</p>
          </div>
        </div>
      </section>

      <div className="mt-4 rounded-xl border border-border bg-card p-3 text-[11px] leading-4 text-muted-foreground">
        {t.esg.rent.footerNoticePrefix}<strong className="text-foreground">{t.esg.reusable.statusTitle}</strong>{t.esg.rent.footerNoticeSuffix}
      </div>
    </div>
  );
}
