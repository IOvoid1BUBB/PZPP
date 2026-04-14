"use client";

import React, { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Question = {
  id: string;
  type?: "OPEN_TEXT" | "MULTIPLE_CHOICE_ABC" | string;
  question: string;
  answer?: string | null;
  optionA?: string | null;
  optionB?: string | null;
  optionC?: string | null;
  correctOption?: string | null;
  order?: number;
};

export default function LessonQuestionsQuiz({ questions }: { questions: Question[] }) {
  const sorted = useMemo(() => {
    const list = Array.isArray(questions) ? questions : [];
    return [...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [questions]);

  const [selected, setSelected] = useState<Record<string, "A" | "B" | "C" | null>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  if (!sorted.length) return null;

  return (
    <section className="rounded-xl border border-[#e5e7eb] bg-white p-5">
      <h3 className="text-lg font-semibold text-[#0f172a]">Pytania do lekcji</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Zaznacz odpowiedź i sprawdź, czy jest poprawna.
      </p>

      <div className="mt-4 space-y-4">
        {sorted.map((q, idx) => {
          const type = q.type === "MULTIPLE_CHOICE_ABC" ? "MULTIPLE_CHOICE_ABC" : "OPEN_TEXT";
          const choice = selected[q.id] ?? null;
          const isChecked = Boolean(checked[q.id]);
          const correct = (q.correctOption || "").toUpperCase() as "A" | "B" | "C" | "";
          const isCorrect = isChecked && choice && correct && choice === correct;

          return (
            <div key={q.id} className="rounded-lg border border-[#e5e7eb] p-4">
              <div className="text-sm font-semibold text-[#0f172a]">
                {idx + 1}. {q.question}
              </div>

              {type === "MULTIPLE_CHOICE_ABC" ? (
                <div className="mt-3 grid gap-2">
                  {([
                    ["A", q.optionA],
                    ["B", q.optionB],
                    ["C", q.optionC],
                  ] as const).map(([key, label]) => (
                    <label
                      key={key}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 text-sm",
                        choice === key ? "border-primary/50 bg-primary/5" : "border-[#e5e7eb] bg-white"
                      )}
                    >
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        className="mt-1"
                        checked={choice === key}
                        onChange={() => setSelected((s) => ({ ...s, [q.id]: key }))}
                      />
                      <span>
                        <span className="mr-2 font-semibold">{key}.</span>
                        {label || <span className="text-muted-foreground">—</span>}
                      </span>
                    </label>
                  ))}

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!choice}
                      onClick={() => setChecked((c) => ({ ...c, [q.id]: true }))}
                    >
                      Sprawdź odpowiedź
                    </Button>
                    {isChecked ? (
                      <span className={cn("text-sm font-medium", isCorrect ? "text-green-600" : "text-red-600")}>
                        {isCorrect ? "Poprawnie" : "Niepoprawnie"}
                      </span>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="mt-3 text-sm text-muted-foreground">
                  {q.answer ? q.answer : "To pytanie otwarte. Odpowiedź sprawdź w treści lekcji lub u prowadzącego."}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

