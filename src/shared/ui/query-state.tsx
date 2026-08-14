"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";

// 로딩·빈 데이터·오류를 구분해서 보여주기 위한 공용 상태 표시. 문구는 화면(다국어)에서 넘긴다.
export function ErrorState({
  message = "데이터를 불러오지 못했습니다.",
  retryLabel = "다시 시도",
  onRetry,
  className,
}: {
  message?: string;
  retryLabel?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center",
        className,
      )}
    >
      <p className="text-xs text-destructive">{message}</p>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          <RefreshCw className="size-3.5" /> {retryLabel}
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ message, className }: { message: string; className?: string }) {
  return (
    <p className={cn("rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground", className)}>
      {message}
    </p>
  );
}

export function queryErrorMessage(error: unknown, fallback = "데이터를 불러오지 못했습니다.") {
  return error instanceof Error && error.message ? error.message : fallback;
}
