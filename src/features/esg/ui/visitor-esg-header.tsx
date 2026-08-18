import Link from "next/link";
import { ArrowLeft, Recycle } from "lucide-react";

export function VisitorEsgHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-4">
      <Link href="/visitor/coupons" className="mb-4 inline-flex items-center gap-1 text-xs font-semibold text-esg-text">
        <ArrowLeft className="size-3.5" /> ESG 순환
      </Link>
      <div className="flex items-start gap-2.5">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-esg/10 text-esg-text">
          <Recycle className="size-5" />
        </span>
        <div>
          <h1 className="text-lg font-extrabold text-foreground">{title}</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}
