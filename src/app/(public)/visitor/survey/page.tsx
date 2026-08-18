"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Star, CheckCircle2 } from "lucide-react";
import { fetchSurveyQuestions, hasSurveyAnswer, submitSurvey } from "@/entities/visitor";
import type { SurveyAnswer, SurveyQuestion } from "@/entities/visitor";
import { useTranslation } from "@/shared/lib/i18n";
import { ErrorText, Form, SubmitButton } from "@/shared/ui/form";
import { QueryState } from "@/shared/ui/query-state";
import { SkeletonList } from "@/shared/ui/skeleton";
import { cn } from "@/shared/lib/utils";

export default function SurveyPage() {
  const { t, locale } = useTranslation();
  const survey = useQuery({ queryKey: ["survey-questions", locale], queryFn: () => fetchSurveyQuestions(locale) });
  const [answers, setAnswers] = useState<Record<string, SurveyAnswer>>({});
  // 오류는 제출 버튼 위에 그대로 그리므로 전역 토스트는 끈다.
  const submit = useMutation({
    mutationFn: (questions: SurveyQuestion[]) => submitSurvey(questions, answers),
    meta: { silent: true },
  });

  if (submit.isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-24 text-center">
        <span className="inline-flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 className="size-7" />
        </span>
        <h2 className="text-base font-bold text-foreground">{t.survey.thanksTitle}</h2>
        <p className="text-xs text-muted-foreground">{t.survey.thanksSubtitle}</p>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-6">
      <h1 className="text-lg font-extrabold text-foreground">{t.survey.title}</h1>
      <p className="text-xs text-muted-foreground">{t.survey.subtitle}</p>

      {/* VIS-10·OPS-11: 익명 처리와 열람·삭제 요구 제외 범위를 수집 시점에 고지한다. */}
      <p className="mt-3 rounded-xl bg-muted/60 p-3 text-[0.6875rem] leading-5 text-muted-foreground">
        {t.survey.anonymousNotice}{" "}
        <Link href="/visitor/privacy" className="font-semibold text-primary underline">
          {t.privacy.title}
        </Link>
      </p>

      <QueryState
        query={survey}
        className="mt-4"
        skeleton={<SkeletonList count={2} className="h-24 w-full rounded-xl" wrapperClassName="mt-4 space-y-3" />}
        errorMessage={t.common.loadFailed}
        retryLabel={t.common.retry}
        empty={t.common.empty}
      >
        {(questions) => (
          <Form className="mt-4 space-y-5" onSubmit={() => submit.mutate(questions)}>
            {questions.map((q) => (
              <div key={q.id} className="rounded-xl border border-border bg-card p-4">
                <p className="text-sm font-semibold text-foreground">{q.question}</p>
                {q.type === "rating" ? (
                  <div className="mt-3 flex gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setAnswers((a) => ({ ...a, [q.id]: n }))}
                        aria-label={t.survey.ratingAria(n)}
                      >
                        <Star
                          className={cn(
                            "size-7 transition-colors",
                            (Number(answers[q.id]) || 0) >= n ? "fill-amber-400 text-amber-400" : "text-muted-foreground",
                          )}
                        />
                      </button>
                    ))}
                  </div>
                ) : q.type === "single_choice" ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {q.options?.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt.value }))}
                        aria-pressed={answers[q.id] === opt.value}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs font-semibold",
                          answers[q.id] === opt.value
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background text-foreground",
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                ) : q.type === "multiple_choice" ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {q.options?.map((opt) => {
                      const answer = answers[q.id];
                      const selected = Array.isArray(answer) && answer.includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setAnswers((current) => {
                            const currentAnswer = current[q.id];
                            const values = Array.isArray(currentAnswer) ? currentAnswer : [];
                            return {
                              ...current,
                              [q.id]: values.includes(opt.value)
                                ? values.filter((value) => value !== opt.value)
                                : [...values, opt.value],
                            };
                          })}
                          aria-pressed={selected}
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-xs font-semibold",
                            selected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background text-foreground",
                          )}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <textarea
                    value={String(answers[q.id] ?? "")}
                    onChange={(event) => setAnswers((current) => ({ ...current, [q.id]: event.target.value }))}
                    className="mt-3 min-h-24 w-full rounded-lg border border-border bg-background p-3 text-sm outline-none focus:border-primary"
                    placeholder={t.survey.textPlaceholder}
                  />
                )}
              </div>
            ))}
            <ErrorText error={submit.error} fallback={t.survey.submitError} className="text-sm" />
            <SubmitButton
              mutation={submit}
              size="default"
              className="w-full"
              pending={t.survey.submitting}
              disabled={questions.some((question) => question.required && !hasSurveyAnswer(answers[question.id]))}
            >
              {t.survey.submit}
            </SubmitButton>
          </Form>
        )}
      </QueryState>
    </div>
  );
}
