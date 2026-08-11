"use client";

import { FormEvent, useEffect, useState } from "react";
import { currentAdmin, loginAdmin } from "@/shared/lib/api";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Logo } from "@/shared/ui/logo";
import { Skeleton } from "@/shared/ui/skeleton";

export function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    currentAdmin().then(() => setAuthenticated(true)).catch(() => {}).finally(() => setChecking(false));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await loginAdmin(email, password);
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
  if (authenticated) return children;

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
