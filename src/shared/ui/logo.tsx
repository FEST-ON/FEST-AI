import { cn } from "@/shared/lib/utils";

interface LogoProps {
  className?: string;
  withTagline?: boolean;
  tone?: "default" | "dark";
}

/** FESTAI 워드마크: "F:" 뒤에 강조된 "EST", 이어서 "AI" — 아이콘 없이 타이포그래피만으로 구성 */
export function Logo({
  className,
  withTagline = false,
  tone = "default",
}: LogoProps) {
  const isDark = tone === "dark";
  return (
    <div className={cn("flex flex-col leading-none", className)}>
      <span
        className={cn(
          "text-xl font-extrabold tracking-tight",
          isDark ? "text-white" : "text-foreground",
        )}
      >
        F
        <span className="bg-brand-gradient-ink bg-clip-text text-transparent font-black">
          :EST
        </span>
        <span className="ml-1">AI</span>
      </span>
      {withTagline && (
        <span
          className={cn(
            "mt-0.5 text-[0.6875rem] font-medium",
            isDark ? "text-white/60" : "text-muted-foreground",
          )}
        >
          AI·ESG 지역축제 DX 플랫폼
        </span>
      )}
    </div>
  );
}
