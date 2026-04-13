"use client";

import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const lessonSchema = z.object({
  title: z.string().trim().min(1, "Podaj tytuł lekcji."),
  order: z
    .union([z.number(), z.string()])
    .transform((v) => {
      const n = typeof v === "number" ? v : Number.parseInt(String(v), 10);
      return Number.isFinite(n) ? n : 1;
    })
    .refine((v) => v > 0, "Kolejność musi być większa od zera."),
  videoUrl: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length ? v : null)),
  videoText: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length ? v : null)),
  content: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length ? v : null)),
  resources: z
    .array(
      z.object({
        type: z.enum(["LINK", "PDF"]).default("LINK"),
        title: z.string().trim().min(1, "Podaj tytuł materiału."),
        url: z.string().trim().min(1, "Podaj URL materiału."),
        order: z
          .union([z.number(), z.string()])
          .optional()
          .transform((v) => {
            if (v === undefined || v === "") return null;
            const n = typeof v === "number" ? v : Number.parseInt(String(v), 10);
            return Number.isFinite(n) ? n : null;
          }),
      }),
    )
    .default([]),
  questions: z
    .array(
      z.object({
        question: z.string().trim().min(1, "Podaj treść pytania."),
        answer: z
          .string()
          .trim()
          .optional()
          .transform((v) => (v && v.length ? v : null)),
        order: z
          .union([z.number(), z.string()])
          .optional()
          .transform((v) => {
            if (v === undefined || v === "") return null;
            const n = typeof v === "number" ? v : Number.parseInt(String(v), 10);
            return Number.isFinite(n) ? n : null;
          }),
      }),
    )
    .default([]),
});

export default function LessonFormDialog({
  mode,
  lesson,
  trigger,
  isPending,
  onSubmit,
}) {
  const [open, setOpen] = useState(false);

  const defaultValues = useMemo(() => {
    if (mode === "edit" && lesson) {
      return {
        title: lesson.title ?? "",
        order: lesson.order ?? 1,
        videoUrl: lesson.videoUrl ?? "",
        videoText: lesson.videoText ?? "",
        content: lesson.content ?? "",
        resources: Array.isArray(lesson.resources)
          ? lesson.resources.map((r) => ({
              type: r.type === "PDF" ? "PDF" : "LINK",
              title: r.title ?? "",
              url: r.url ?? "",
              order: r.order ?? "",
            }))
          : [],
        questions: Array.isArray(lesson.questions)
          ? lesson.questions.map((q) => ({
              question: q.question ?? "",
              answer: q.answer ?? "",
              order: q.order ?? "",
            }))
          : [],
      };
    }
    return {
      title: "",
      order: 1,
      videoUrl: "",
      videoText: "",
      content: "",
      resources: [],
      questions: [],
    };
  }, [mode, lesson]);

  const form = useForm({
    resolver: zodResolver(lessonSchema),
    defaultValues,
  });

  const resourcesFieldArray = useFieldArray({
    control: form.control,
    name: "resources",
  });
  const questionsFieldArray = useFieldArray({
    control: form.control,
    name: "questions",
  });

  useEffect(() => {
    if (open) form.reset(defaultValues);
  }, [open, defaultValues, form]);

  const title = mode === "edit" ? "Edytuj lekcję" : "Dodaj lekcję";
  const description =
    mode === "edit"
      ? "Zaktualizuj dane lekcji. Zmiany zapiszą się w bazie."
      : "Dodaj lekcję do modułu i ustaw jej kolejność.";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            className="grid gap-4"
            onSubmit={form.handleSubmit(async (values) => {
              await onSubmit(values);
              setOpen(false);
            })}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Tytuł</FormLabel>
                    <FormControl>
                      <Input placeholder="Np. Jak przygotować ofertę" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kolejność</FormLabel>
                    <FormControl>
                      <Input
                        inputMode="numeric"
                        placeholder="Np. 1"
                        value={field.value ?? 1}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="videoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Wideo URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="videoText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tekst do wideo (transkrypcja)</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={6}
                      placeholder="Wklej transkrypcję lub notatki do filmu (opcjonalnie)"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Ten tekst będzie wyświetlany studentowi w sekcji lekcji.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Treść</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={6}
                      placeholder="Notatki/treść lekcji (opcjonalnie)"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Jeśli wideo nie jest dostępne, treść może być głównym materiałem lekcji.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3 rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="text-sm font-semibold">Materiały do lekcji</div>
                  <div className="text-xs text-muted-foreground">
                    Dodaj linki lub pliki PDF (jako URL do pliku).
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    resourcesFieldArray.append({
                      type: "LINK",
                      title: "Link",
                      url: "",
                      order: "",
                    })
                  }
                >
                  Dodaj materiał
                </Button>
              </div>

              {resourcesFieldArray.fields.length === 0 ? (
                <div className="py-3 text-sm text-muted-foreground">
                  Brak materiałów.
                </div>
              ) : (
                <div className="space-y-3">
                  {resourcesFieldArray.fields.map((f, idx) => (
                    <div key={f.id} className="grid gap-3 rounded-md border p-3 sm:grid-cols-6">
                      <FormField
                        control={form.control}
                        name={`resources.${idx}.type`}
                        render={({ field }) => (
                          <FormItem className="sm:col-span-2">
                            <FormLabel>Typ</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Wybierz" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="LINK">Link</SelectItem>
                                <SelectItem value="PDF">PDF</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`resources.${idx}.title`}
                        render={({ field }) => (
                          <FormItem className="sm:col-span-2">
                            <FormLabel>Tytuł</FormLabel>
                            <FormControl>
                              <Input placeholder="Np. Checklista" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`resources.${idx}.order`}
                        render={({ field }) => (
                          <FormItem className="sm:col-span-1">
                            <FormLabel>Kolejność</FormLabel>
                            <FormControl>
                              <Input
                                inputMode="numeric"
                                placeholder="1"
                                value={field.value ?? ""}
                                onChange={(e) => field.onChange(e.target.value)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex items-end justify-end sm:col-span-1">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => resourcesFieldArray.remove(idx)}
                        >
                          Usuń
                        </Button>
                      </div>

                      <FormField
                        control={form.control}
                        name={`resources.${idx}.url`}
                        render={({ field }) => (
                          <FormItem className="sm:col-span-6">
                            <FormLabel>URL</FormLabel>
                            <FormControl>
                              <Input placeholder="https://…" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3 rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="text-sm font-semibold">Pytania i odpowiedzi</div>
                  <div className="text-xs text-muted-foreground">
                    Te pytania zobaczy student przy aktualnej lekcji.
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    questionsFieldArray.append({
                      question: "",
                      answer: "",
                      order: "",
                    })
                  }
                >
                  Dodaj pytanie
                </Button>
              </div>

              {questionsFieldArray.fields.length === 0 ? (
                <div className="py-3 text-sm text-muted-foreground">Brak pytań dla lekcji.</div>
              ) : (
                <div className="space-y-3">
                  {questionsFieldArray.fields.map((f, idx) => (
                    <div key={f.id} className="grid gap-3 rounded-md border p-3 sm:grid-cols-6">
                      <FormField
                        control={form.control}
                        name={`questions.${idx}.question`}
                        render={({ field }) => (
                          <FormItem className="sm:col-span-4">
                            <FormLabel>Pytanie</FormLabel>
                            <FormControl>
                              <Input placeholder="Np. Co to jest JOIN?" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`questions.${idx}.order`}
                        render={({ field }) => (
                          <FormItem className="sm:col-span-1">
                            <FormLabel>Kolejność</FormLabel>
                            <FormControl>
                              <Input
                                inputMode="numeric"
                                placeholder="1"
                                value={field.value ?? ""}
                                onChange={(e) => field.onChange(e.target.value)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex items-end justify-end sm:col-span-1">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => questionsFieldArray.remove(idx)}
                        >
                          Usuń
                        </Button>
                      </div>

                      <FormField
                        control={form.control}
                        name={`questions.${idx}.answer`}
                        render={({ field }) => (
                          <FormItem className="sm:col-span-6">
                            <FormLabel>Odpowiedź (opcjonalnie)</FormLabel>
                            <FormControl>
                              <Textarea rows={3} placeholder="Dodaj odpowiedź dla studenta" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {mode === "edit" ? "Zapisz" : "Dodaj"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

