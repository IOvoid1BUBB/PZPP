"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

import {
  createModule,
  updateModule,
  deleteModule,
  createLesson,
  updateLesson,
  deleteLesson,
} from "@/app/actions/courseActions";

import ModuleFormDialog from "@/components/features/courses/ModuleFormDialog";
import ModuleRowActions from "@/components/features/courses/ModuleRowActions";
import LessonFormDialog from "@/components/features/courses/LessonFormDialog";
import LessonRowActions from "@/components/features/courses/LessonRowActions";

export default function CourseModulesManager({ course }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const onCreateModule = (values) => {
    startTransition(async () => {
      const res = await createModule(course.id, values);
      if (!res?.success) {
        toast({
          title: "Nie udało się dodać modułu",
          description: res?.error ?? "Wystąpił błąd serwera.",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Moduł dodany", description: "Możesz teraz dodać lekcje." });
      router.refresh();
    });
  };

  const onUpdateModule = (moduleId, values) => {
    startTransition(async () => {
      const res = await updateModule(moduleId, values);
      if (!res?.success) {
        toast({
          title: "Nie udało się zapisać modułu",
          description: res?.error ?? "Wystąpił błąd serwera.",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Zapisano moduł", description: "Zmiany zostały zapisane." });
      router.refresh();
    });
  };

  const onDeleteModule = (moduleId) => {
    startTransition(async () => {
      const res = await deleteModule(moduleId);
      if (!res?.success) {
        toast({
          title: "Nie udało się usunąć modułu",
          description: res?.error ?? "Wystąpił błąd serwera.",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Usunięto moduł" });
      router.refresh();
    });
  };

  const onCreateLesson = (moduleId, values) => {
    startTransition(async () => {
      const res = await createLesson(moduleId, values);
      if (!res?.success) {
        toast({
          title: "Nie udało się dodać lekcji",
          description: res?.error ?? "Wystąpił błąd serwera.",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Lekcja dodana" });
      router.refresh();
    });
  };

  const onUpdateLesson = (lessonId, values) => {
    startTransition(async () => {
      const res = await updateLesson(lessonId, values);
      if (!res?.success) {
        toast({
          title: "Nie udało się zapisać lekcji",
          description: res?.error ?? "Wystąpił błąd serwera.",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Zapisano lekcję" });
      router.refresh();
    });
  };

  const onDeleteLesson = (lessonId) => {
    startTransition(async () => {
      const res = await deleteLesson(lessonId);
      if (!res?.success) {
        toast({
          title: "Nie udało się usunąć lekcji",
          description: res?.error ?? "Wystąpił błąd serwera.",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Usunięto lekcję" });
      router.refresh();
    });
  };

  const modules = course?.modules ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={course.isPublished ? "default" : "secondary"}>
            {course.isPublished ? "Opublikowany" : "Szkic"}
          </Badge>
          <span className="text-sm text-muted-foreground">
            Moduły: {modules.length}
          </span>
        </div>

        <ModuleFormDialog
          mode="create"
          trigger={
            <Button disabled={isPending}>
              <Plus className="mr-2 size-4" />
              Dodaj moduł
            </Button>
          }
          isPending={isPending}
          onSubmit={onCreateModule}
        />
      </div>

      <Card className="p-4">
        {modules.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">
            Brak modułów. Dodaj pierwszy moduł, aby rozpocząć budowę kursu.
          </div>
        ) : (
          <Accordion type="multiple" className="w-full">
            {modules.map((m) => (
              <AccordionItem key={m.id} value={m.id}>
                <AccordionHeader>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex flex-col">
                      <span className="text-base font-semibold">
                        {m.order}. {m.title}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        Lekcje: {m.lessons?.length ?? 0}
                      </span>
                    </div>
                  </AccordionTrigger>

                  <div
                    className="flex shrink-0 items-center gap-2 pr-2 pt-3"
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <ModuleRowActions
                      module={m}
                      disabled={isPending}
                      onUpdate={onUpdateModule}
                      onDelete={onDeleteModule}
                    />
                  </div>
                </AccordionHeader>
                <AccordionContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">Lekcje</div>
                      <LessonFormDialog
                        mode="create"
                        trigger={
                          <Button size="sm" variant="outline" disabled={isPending}>
                            <Plus className="mr-2 size-4" />
                            Dodaj lekcję
                          </Button>
                        }
                        isPending={isPending}
                        onSubmit={(values) => onCreateLesson(m.id, values)}
                      />
                    </div>

                    <div className="overflow-hidden rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tytuł</TableHead>
                            <TableHead className="w-28">Kolejność</TableHead>
                            <TableHead className="hidden md:table-cell">
                              Wideo URL
                            </TableHead>
                            <TableHead className="w-12" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(m.lessons ?? []).length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={4}
                                className="py-8 text-center text-muted-foreground"
                              >
                                Brak lekcji w tym module.
                              </TableCell>
                            </TableRow>
                          ) : (
                            (m.lessons ?? []).map((lesson) => (
                              <TableRow key={lesson.id} className="align-middle">
                                <TableCell className="font-medium">
                                  <div className="flex flex-col">
                                    <span>{lesson.title}</span>
                                    {lesson.content ? (
                                      <span className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                                        {lesson.content}
                                      </span>
                                    ) : null}
                                  </div>
                                </TableCell>
                                <TableCell>{lesson.order}</TableCell>
                                <TableCell className="hidden md:table-cell">
                                  {lesson.videoUrl ? (
                                    <span className="break-all text-sm text-muted-foreground">
                                      {lesson.videoUrl}
                                    </span>
                                  ) : (
                                    "—"
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <LessonRowActions
                                    lesson={lesson}
                                    disabled={isPending}
                                    onUpdate={onUpdateLesson}
                                    onDelete={onDeleteLesson}
                                  />
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </Card>
    </div>
  );
}

