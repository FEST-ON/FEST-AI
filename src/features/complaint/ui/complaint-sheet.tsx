"use client";

import { useState } from "react";
import { MessageSquareWarning, CheckCircle2 } from "lucide-react";
import { useTicketBoardStore } from "@/features/ticket-board/model/store";
import { useTranslation } from "@/shared/lib/i18n";
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

const CATEGORIES = [
  "편의시설",
  "안전",
  "교통",
  "ESG운영",
  "일정",
  "기타",
] as const;

function formatCreatedAt(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function ComplaintSheet({
  triggerClassName,
}: { triggerClassName?: string } = {}) {
  const { t } = useTranslation();
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
            aria-label={t.complaint.ariaLabel}
          />
        }
      >
        <MessageSquareWarning className="size-3.5" />
      </SheetTrigger>
      <SheetContent side="bottom" className="mx-auto max-w-md rounded-t-3xl">
        {submitted ? (
          <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
            <CheckCircle2 className="size-10 text-emerald-500" />
            <div>
              <p className="text-sm font-bold text-foreground">
                {t.complaint.thanksTitle}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t.complaint.thanksDescription}
              </p>
            </div>
            <Button size="sm" onClick={() => setOpen(false)}>
              {t.complaint.closeButton}
            </Button>
          </div>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle>{t.complaint.sheetTitle}</SheetTitle>
              <SheetDescription>
                {t.complaint.sheetDescription}
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-4 px-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="complaint-title"
                  className="text-sm font-semibold"
                >
                  {t.complaint.titleLabel}
                </Label>
                <Input
                  id="complaint-title"
                  placeholder={t.complaint.titlePlaceholder}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">{t.complaint.categoryLabel}</Label>
                <Select
                  value={category}
                  onValueChange={(v) => setCategory(v as typeof category)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(value: unknown) => t.complaint.categories[value as string] ?? value}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {t.complaint.categories[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="complaint-description"
                  className="text-sm font-semibold"
                >
                  {t.complaint.descriptionLabel}
                </Label>
                <Textarea
                  id="complaint-description"
                  placeholder={t.complaint.descriptionPlaceholder}
                  className="min-h-28"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
            <SheetFooter>
              <Button disabled={!canSubmit} onClick={handleSubmit}>
                {t.complaint.submitButton}
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
