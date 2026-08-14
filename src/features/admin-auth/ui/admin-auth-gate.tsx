"use client";

import { FormEvent, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { currentAdmin, loginAdmin } from "@/shared/lib/api";
import { useAdminSessionStore } from "@/features/admin-auth/model/store";
import { ADMIN_ROLE_LABEL, canAccessPath } from "@/shared/lib/permissions";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Logo } from "@/shared/ui/logo";
import { Skeleton } from "@/shared/ui/skeleton";

export function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const user = useAdminSessionStore((s) => s.user);
  const setUser = useAdminSessionStore((s) => s.setUser);
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    currentAdmin()
      .then((admin) => {
        setUser(admin);
        setAuthenticated(true);
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [setUser]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const admin = await loginAdmin(email, password);
      setUser(admin);
      setAuthenticated(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "로그인에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  if (checking) {
    return <div className="mx-auto mt-32 w-full max-w-sm space-y-3"><Skeleton className="h-12" /><Skeleton className="h-44" /></div>;
  }
  if (authenticated) {
    if (!canAccessPath(user?.role, pathname)) {
      return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
          <ShieldAlert className="size-10 text-destructive" />
          <div>
            <h1 className="text-lg font-bold text-foreground">접근 권한이 없어요</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              현재 역할({user?.role ? (ADMIN_ROLE_LABEL[user.role] ?? user.role) : "알 수 없음"})로는 이 화면에 접근할 수 없어요.
            </p>
          </div>
          <a href="/admin" className="text-sm font-semibold text-primary hover:underline">
            대시보드로 돌아가기
          </a>
        </main>
      );
    }
    return children;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <Logo />
        <div>
          <h1 className="text-lg font-bold">운영자 로그인</h1>
          <p className="text-xs text-muted-foreground">백엔드 데모 계정으로 로그인하세요.</p>
        </div>
        <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} aria-label="이메일" placeholder="이메일" autoComplete="username" required />
        <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} aria-label="비밀번호" placeholder="비밀번호" autoComplete="current-password" required />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "로그인 중..." : "로그인"}
        </Button>
      </form>
    </main>
  );
}
