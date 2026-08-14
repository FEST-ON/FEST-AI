"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CircleX, FileCheck2, Send, Undo2, Upload } from "lucide-react";
import { adminApi, adminFestivalId } from "@/shared/lib/api";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import { Textarea } from "@/shared/ui/textarea";
import { contentAction, contentPreview, type ContentVersionStatus } from "@/features/content-review/model/content";

interface ContentReview {
  reviewerId: string;
  decision: "APPROVED" | "REJECTED";
  comment?: string;
  decidedAt: string;
}

interface ContentVersion {
  id: string;
  version_no: number;
  language: string;
  body: Record<string, unknown>;
  change_note?: string;
  status: ContentVersionStatus;
  created_at: string;
  reviews: ContentReview[];
}

interface ContentItem {
  id: string;
  content_type: string;
  slug: string;
  lifecycle_status: "DRAFT" | "PUBLISHED" | "UNPUBLISHED";
  published_version_id?: string;
  versions: ContentVersion[];
}

const STATUS = {
  DRAFT: { label: "초안", style: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  IN_REVIEW: { label: "검수 중", style: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300" },
  APPROVED: { label: "승인", style: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" },
  REJECTED: { label: "반려", style: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300" },
} as const;

async function fetchContentItems() {
  const festivalId = await adminFestivalId();
  return adminApi<ContentItem[]>(`/admin/festivals/${festivalId}/content-items`);
}

async function changeContentState(input: {
  action: "SUBMIT" | "APPROVE" | "REJECT" | "PUBLISH" | "UNPUBLISH";
  itemId: string;
  versionId: string;
  comment?: string;
}) {
  const festivalId = await adminFestivalId();
  if (input.action === "SUBMIT") {
    return adminApi(`/admin/festivals/${festivalId}/content-versions/${input.versionId}/submit`, { method: "POST" });
  }
  if (input.action === "APPROVE" || input.action === "REJECT") {
    return adminApi(`/admin/festivals/${festivalId}/content-versions/${input.versionId}/reviews`, {
      method: "POST",
      body: JSON.stringify({ decision: input.action === "APPROVE" ? "APPROVED" : "REJECTED", comment: input.comment || undefined }),
    });
  }
  if (input.action === "PUBLISH") {
    return adminApi(`/admin/festivals/${festivalId}/content-items/${input.itemId}/publish`, {
      method: "POST",
      body: JSON.stringify({ versionId: input.versionId }),
    });
  }
  return adminApi(`/admin/festivals/${festivalId}/content-items/${input.itemId}/unpublish`, { method: "POST" });
}

export default function ContentReviewPage() {
  const queryClient = useQueryClient();
  const [comments, setComments] = useState<Record<string, string>>({});
  const { data = [], isLoading, error } = useQuery({ queryKey: ["content-review"], queryFn: fetchContentItems });
  const mutation = useMutation({
    mutationFn: changeContentState,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["content-review"] }),
  });

  const versions = data.flatMap((item) => item.versions.map((version) => ({ item, version })));
  const reviewCount = versions.filter(({ version }) => version.status === "IN_REVIEW").length;
  const publishedCount = data.filter((item) => item.lifecycle_status === "PUBLISHED").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">콘텐츠 버전을 검수하고 승인된 버전만 방문객 채널에 게시해요.</p>
          <p className="mt-1 text-xs text-muted-foreground">검수 대기 {reviewCount}건 · 게시 중 {publishedCount}건</p>
        </div>
        <Badge variant="outline" className="gap-1.5"><FileCheck2 className="size-3.5" /> 승인·게시 이력 추적</Badge>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-48 rounded-2xl" />)}</div>
      ) : error ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error.message}</p>
      ) : versions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">등록된 콘텐츠 버전이 없습니다.</div>
      ) : (
        <div className="space-y-3">
          {versions.map(({ item, version }) => {
            const isPublished = item.lifecycle_status === "PUBLISHED" && item.published_version_id === version.id;
            const action = contentAction(version.status, isPublished);
            const status = STATUS[version.status];
            return (
              <article key={version.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-bold text-foreground">{contentPreview(version.body)}</h2>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${status.style}`}>{status.label}</span>
                      {isPublished && <Badge className="gap-1 text-[10px]"><Upload className="size-3" /> 게시 중</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.content_type} · {item.slug} · v{version.version_no} · {version.language.toUpperCase()}
                    </p>
                    {version.change_note && <p className="mt-2 text-sm text-foreground/80">변경 메모: {version.change_note}</p>}
                    {version.reviews.length > 0 && (
                      <div className="mt-3 rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
                        최근 검수: {version.reviews.at(-1)?.decision === "APPROVED" ? "승인" : "반려"}
                        {version.reviews.at(-1)?.comment ? ` · ${version.reviews.at(-1)?.comment}` : ""}
                      </div>
                    )}
                  </div>

                  <div className="w-full shrink-0 space-y-2 lg:w-80">
                    {action === "REVIEW" && (
                      <Textarea
                        value={comments[version.id] ?? ""}
                        onChange={(event) => setComments((current) => ({ ...current, [version.id]: event.target.value }))}
                        placeholder="검수 의견(선택)"
                        aria-label={`${contentPreview(version.body)} 검수 의견`}
                      />
                    )}
                    <div className="flex justify-end gap-2">
                      {action === "SUBMIT" && (
                        <Button onClick={() => mutation.mutate({ action: "SUBMIT", itemId: item.id, versionId: version.id })} disabled={mutation.isPending}>
                          <Send /> 검수 요청
                        </Button>
                      )}
                      {action === "REVIEW" && <>
                        <Button variant="destructive" onClick={() => mutation.mutate({ action: "REJECT", itemId: item.id, versionId: version.id, comment: comments[version.id] })} disabled={mutation.isPending}>
                          <CircleX /> 반려
                        </Button>
                        <Button onClick={() => mutation.mutate({ action: "APPROVE", itemId: item.id, versionId: version.id, comment: comments[version.id] })} disabled={mutation.isPending}>
                          <Check /> 승인
                        </Button>
                      </>}
                      {action === "PUBLISH" && (
                        <Button onClick={() => mutation.mutate({ action: "PUBLISH", itemId: item.id, versionId: version.id })} disabled={mutation.isPending}>
                          <Upload /> 게시
                        </Button>
                      )}
                      {action === "UNPUBLISH" && (
                        <Button variant="outline" onClick={() => mutation.mutate({ action: "UNPUBLISH", itemId: item.id, versionId: version.id })} disabled={mutation.isPending}>
                          <Undo2 /> 게시 종료
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {mutation.error && <p className="text-sm text-destructive">{mutation.error.message}</p>}
    </div>
  );
}
