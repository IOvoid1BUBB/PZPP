"use client";

import { useMemo, useState, useTransition } from "react";
import { submitLessonQuiz } from "@/actions/quiz";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LessonQuiz({ lessonId, questions = [] }: { lessonId: string; questions?: any[] }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<any>(null);
  const [isPending, startTransition] = useTransition();

  const sortedQuestions = useMemo(
    () => [...(questions ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [questions],
  );

  if (!sortedQuestions.length) return null;

  const onSubmit = () => {
    startTransition(async () => {
      const response = await submitLessonQuiz({ lessonId, answers });
      setResult(response);
    });
  };

  return (
    <section className="rounded-xl border bg-card p-4">
      <h3 className="text-lg font-semibold">Quiz lekcji</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Pytania pochodzą z konfiguracji lekcji ustawionej przez kreatora. Próg zaliczenia: 80%.
      </p>

      <div className="mt-4 space-y-4">
        {sortedQuestions.map((question, index) => (
          <div key={question.id} className="rounded-lg border p-3">
            <Label className="text-sm font-medium">
              {index + 1}. {question.question}
            </Label>
            {question.type === "MULTIPLE_CHOICE_ABC" ? (
              <div className="mt-2 space-y-2">
                {[
                  ["A", question.optionA],
                  ["B", question.optionB],
                  ["C", question.optionC],
                ].map(([optionKey, optionValue]) => (
                  <label key={optionKey} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name={`quiz-${question.id}`}
                      value={optionKey}
                      checked={answers[question.id] === optionKey}
                      onChange={() => setAnswers((prev) => ({ ...prev, [question.id]: optionKey }))}
                    />
                    <span>
                      {optionKey}. {optionValue || "Brak opisu odpowiedzi"}
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <Input
                className="mt-2"
                placeholder="Wpisz odpowiedź"
                value={answers[question.id] ?? ""}
                onChange={(event) =>
                  setAnswers((prev) => ({ ...prev, [question.id]: event.target.value }))
                }
              />
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Button type="button" onClick={onSubmit} disabled={isPending}>
          {isPending ? "Sprawdzam..." : "Sprawdź quiz"}
        </Button>
        {result?.success ? (
          <span className={result.passed ? "text-sm text-green-600" : "text-sm text-destructive"}>
            Wynik: {result.score}% ({result.passed ? "zaliczony" : "niezaliczony"})
          </span>
        ) : null}
      </div>
      {result?.error ? <p className="mt-2 text-sm text-destructive">{result.error}</p> : null}
    </section>
  );
}
