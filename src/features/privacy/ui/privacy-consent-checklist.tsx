"use client";

import { ShieldCheck } from "lucide-react";
import { Checkbox } from "@/shared/ui/checkbox";
import type { PrivacyConsentGate } from "@/features/privacy/model/use-privacy-consent-gate";

/** 개인정보 수집 항목을 항목별 체크박스로 보여준다. 필수/선택 배지는 withdrawable 여부로 갈린다. */
export function PrivacyConsentChecklist({ gate }: { gate: PrivacyConsentGate }) {
  if (gate.isError) return null;

  return (
    <section className="mt-6 w-full rounded-2xl border border-border bg-card p-5 sm:p-6 lg:w-fit lg:min-w-md">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
        <ShieldCheck className="size-3.5 text-primary" />
        개인정보 수집·이용 동의
      </p>
      <div className="mt-3 flex flex-col gap-2">
        {gate.items.map((item) => {
          const required = !item.withdrawable;
          return (
            <label
              key={item.key}
              className="flex items-start gap-2.5 rounded-xl border border-border bg-background p-3"
            >
              <Checkbox
                checked={gate.checked[item.key] ?? false}
                onCheckedChange={(value) => gate.toggle(item.key, value)}
                className="mt-0.5"
              />
              <span className="min-w-0">
                <span className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-foreground">{item.label}</span>
                  <span
                    className={
                      required
                        ? "shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[0.625rem] font-bold text-foreground"
                        : "shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[0.625rem] font-bold text-muted-foreground"
                    }
                  >
                    {required ? "필수" : "선택"}
                  </span>
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{item.basis}</span>
              </span>
            </label>
          );
        })}
        {gate.isLoading && <p className="text-xs text-muted-foreground">수집 항목을 불러오는 중...</p>}
      </div>
      {!gate.canEnter && gate.requiredItems.length > 0 && (
        <p className="mt-3 text-[0.6875rem] text-muted-foreground">
          필수 항목에 모두 동의하면 위 방문객으로 둘러보기 버튼이 활성화돼요.
        </p>
      )}
    </section>
  );
}
