"use client";

import { useState } from "react";
import { MessageSquareWarning, CheckCircle2 } from "lucide-react";
import { useTicketBoardStore } from "@/features/ticket-board/model/store";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
  SheetFooter,
} from "@/shared/ui/sheet";

const CATEGORIES = ["편의시설", "안전", "교통", "ESG운영", "일정", "기타"] as const;

function formatCreatedAt(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function ComplaintSheet({ triggerClassName }: { triggerClassName?: string } = {}) {
  const addTicket = useTicketBoardStore((s) => s.addTicket);
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("기타");
  const [description, setDescription] = useState("");

  const canSubmit = title.trim().length > 0 && description.trim().length > 0;

  function resetForm() {
    setTitle("");
    setCategory("기타");
    setDescription("");
    setSubmitted(false);
  }

  function handleSubmit() {
    if (!canSubmit) return;
    addTicket({
      id: `tk-${Date.now()}`,
      type: "민원",
      title: title.trim(),
      description: description.trim(),
      assignee: "미배정",
        status: "접수",
        apiStatus: "OPEN",
      priority: "중간",
      category,
      createdAt: formatCreatedAt(new Date()),
    });
    setSubmitted(true);
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetForm();
      }}
    >
      <SheetTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            className={cn("rounded-full", triggerClassName)}
            aria-label="민원 제출"
          />
        }
      >
        <MessageSquareWarning className="size-4" />
      </SheetTrigger>
      <SheetContent side="bottom" className="mx-auto max-w-md rounded-t-3xl">
        {submitted ? (
          <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
            <CheckCircle2 className="size-10 text-emerald-500" />
            <div>
              <p className="text-sm font-bold text-foreground">민원이 접수되었어요</p>
              <p className="mt-1 text-xs text-muted-foreground">
                담당자 배정 후 순차적으로 처리돼요. 접수 상태는 운영팀이 확인해요.
              </p>
            </div>
            <Button size="sm" onClick={() => setOpen(false)}>
              닫기
            </Button>
          </div>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle>민원 제출</SheetTitle>
              <SheetDescription>
                불편사항이나 개선 요청을 남겨주시면 운영팀이 확인 후 처리해요.
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-4 px-4">
              <div className="space-y-1.5">
                <Label htmlFor="complaint-title" className="text-sm font-semibold">
                  제목
                </Label>
                <Input
                  id="complaint-title"
                  placeholder="예: 그늘막이 부족해요"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">분류</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as typeof category)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="complaint-description" className="text-sm font-semibold">
                  상세 내용
                </Label>
                <Textarea
                  id="complaint-description"
                  placeholder="어떤 문제가 있었는지 자세히 적어주세요"
                  className="min-h-28"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
            <SheetFooter>
              <Button disabled={!canSubmit} onClick={handleSubmit}>
                민원 제출하기
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
