"use client";

import { useState } from "react";
import { MessageSquareWarning, CheckCircle2 } from "lucide-react";
import { json, visitorApi } from "@/shared/lib/api";
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

export function ComplaintSheet({
  triggerClassName,
}: { triggerClassName?: string } = {}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("기타");
  const [description, setDescription] = useState("");

  const canSubmit = title.trim().length > 0 && description.trim().length > 0;

  function resetForm() {
    setTitle("");
    setCategory("기타");
    setDescription("");
    setSubmitted(false);
    setError("");
  }

  async function handleSubmit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await visitorApi("/visitor/complaints", json("POST", { title, category, description }));
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "민원 접수에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
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
              {error ? (
                <p className="text-xs text-destructive" role="alert">{error}</p>
              ) : null}
              <Button disabled={!canSubmit || submitting} onClick={handleSubmit}>
                {t.complaint.submitButton}
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
