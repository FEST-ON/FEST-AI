"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Search, ShieldCheck } from "lucide-react";
import {
  createInternalDocument,
  DOCUMENT_ROLES,
  fetchInternalDocuments,
  searchOperations,
  type NewInternalDocument,
} from "@/features/ops-documents/api/documents";
import { ADMIN_ROLE_LABEL } from "@/shared/lib/permissions";
import { Badge } from "@/shared/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { Skeleton, SkeletonList } from "@/shared/ui/skeleton";
import { QueryState, queryErrorMessage } from "@/shared/ui/query-state";
import { useForm } from "@/shared/lib/use-form";
import { seoulDateTime } from "@/shared/lib/utils";

const DOCUMENT_TYPES = [
  { value: "MANUAL", label: "운영 매뉴얼" },
  { value: "GUIDELINE", label: "지침" },
  { value: "EMERGENCY", label: "비상 대응" },
  { value: "CONTACT", label: "연락처·조직도" },
  { value: "ETC", label: "기타" },
];

const EMPTY_DOCUMENT: NewInternalDocument = {
  title: "", documentType: "MANUAL", body: "", sourceUrl: "",
  allowedRoles: ["SUPER_ADMIN", "FESTIVAL_MANAGER"],
};

export default function DocumentsPage() {
  const queryClient = useQueryClient();
  const { form, set, field, setForm, reset } = useForm<NewInternalDocument>(EMPTY_DOCUMENT);
  const [question, setQuestion] = useState("");

  const documents = useQuery({ queryKey: ["internal-documents"], queryFn: fetchInternalDocuments });
  const create = useMutation({
    mutationFn: createInternalDocument,
    meta: { success: "운영 문서를 등록했어요." },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["internal-documents"] });
      reset();
    },
  });
  const search = useMutation({ mutationFn: searchOperations, meta: { silent: true } });

  function toggleRole(role: string) {
    setForm((previous) => ({
      ...previous,
      allowedRoles: previous.allowedRoles.includes(role)
        ? previous.allowedRoles.filter((value) => value !== role)
        : [...previous.allowedRoles, role],
    }));
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        운영 매뉴얼·지침을 등록하고 자연어로 검색해요. 검색은 본인 역할이 열람할 수 있는 문서만 찾고, 결과 본문의 연락처·이메일은 자동으로 마스킹됩니다.
      </p>

      <section className="rounded-2xl border border-primary/15 bg-primary/[0.04] p-5">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-foreground"><Search className="size-4 text-primary" /> 운영 문서 검색</h2>
        <form
          className="mt-3 flex flex-wrap gap-2"
          onSubmit={(event) => { event.preventDefault(); search.mutate(question); }}
        >
          <Input
            className="min-w-56 flex-1"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            minLength={2}
            required
            placeholder="예: 우천 시 공연 취소 절차는 어떻게 되나요?"
          />
          <Button type="submit" size="sm" disabled={search.isPending}>{search.isPending ? "검색 중..." : "검색"}</Button>
        </form>

        {search.isPending && <Skeleton className="mt-3 h-20 w-full rounded-xl" />}
        {search.error && <p className="mt-3 text-xs text-destructive">{queryErrorMessage(search.error)}</p>}
        {search.data && (
          <div className="mt-3 rounded-xl border border-border bg-background p-4">
            <p className="flex items-center gap-1 text-[11px] font-semibold text-primary">
              <ShieldCheck className="size-3" /> 권한 범위 문서 · 개인정보 마스킹 적용
            </p>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-foreground">{search.data.answer}</p>
            {search.data.sources.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-2">
                {search.data.sources.map((source) => (
                  <li key={source.documentId}>
                    <Badge variant="outline" className="text-[10px]">{source.title}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-foreground"><FileText className="size-4 text-primary" /> 운영 문서 등록</h2>
        <form className="mt-3 space-y-3" onSubmit={(event) => { event.preventDefault(); create.mutate({ ...form, sourceUrl: form.sourceUrl || undefined }); }}>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="doc-title">제목</Label>
              <Input id="doc-title" {...field("title")} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="doc-type">문서 유형</Label>
              <Select value={form.documentType} onValueChange={(value) => set("documentType")(String(value))}>
                <SelectTrigger id="doc-type" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map(({ value, label }) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="doc-url">원문 링크(선택)</Label>
              <Input id="doc-url" {...field("sourceUrl")} placeholder="https://" />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="doc-body">본문</Label>
            <Textarea id="doc-body" rows={5} {...field("body")} required placeholder="운영 절차, 비상 대응, 담당 부서 등을 적어주세요." />
          </div>
          <div className="space-y-1">
            <Label>열람 권한</Label>
            <div className="flex flex-wrap gap-2">
              {DOCUMENT_ROLES.map((role) => {
                const active = form.allowedRoles.includes(role);
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => toggleRole(role)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground"}`}
                  >
                    {ADMIN_ROLE_LABEL[role]}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center justify-end gap-3">
            {create.error && <p className="mr-auto text-xs text-destructive">{queryErrorMessage(create.error)}</p>}
            <Button type="submit" size="sm" disabled={form.allowedRoles.length === 0 || create.isPending}>
              {create.isPending ? "등록 중..." : "문서 등록"}
            </Button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-bold text-foreground">
          등록된 문서 {(documents.data?.length ?? 0) > 0 && `(${documents.data?.length})`}
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">본인 역할이 열람할 수 있는 문서만 보여요.</p>
        <div className="mt-3">
          <QueryState query={documents} empty="등록된 운영 문서가 없어요." skeleton={<SkeletonList count={3} className="h-12 w-full rounded-xl" />}>
            {(rows) => (
              <ul className="space-y-2">
                {rows.map((document) => (
                  <li key={document.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{document.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {document.document_type}
                        {document.updated_at && ` · ${seoulDateTime(document.updated_at)}`}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      {document.allowed_roles.map((role) => (
                        <Badge key={role} variant="outline" className="text-[10px]">{ADMIN_ROLE_LABEL[role] ?? role}</Badge>
                      ))}
                      {document.source_url && (
                        <a href={document.source_url} target="_blank" rel="noreferrer" className="text-[11px] font-medium text-primary hover:underline">
                          원문
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </QueryState>
        </div>
      </section>
    </div>
  );
}
