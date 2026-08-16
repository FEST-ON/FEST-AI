import { cn } from "@/shared/lib/utils";

/** 가로 진행률 막대. 값은 0-100(%)이고 범위를 벗어나면 잘라낸다. */
export function Meter({
  percent,
  tone = "primary",
  className,
}: {
  percent: number;
  /** 임계값을 넘었거나 긴급 신호일 때 danger. */
  tone?: "primary" | "danger";
  className?: string;
}) {
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div
        className={cn("h-full rounded-full", tone === "danger" ? "bg-red-500" : "bg-primary")}
        style={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }}
      />
    </div>
  );
}
