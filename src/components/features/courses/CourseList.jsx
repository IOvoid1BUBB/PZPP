"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

import {
  createCourse,
  deleteCourse,
  updateCourse,
} from "@/app/actions/courseActions";

import CourseFormDialog from "@/components/features/courses/CourseFormDialog";
import CourseRowActions from "@/components/features/courses/CourseRowActions";

export default function CourseList({ initialCourses }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [query, setQuery] = useState("");
  const courses = useMemo(() => initialCourses ?? [], [initialCourses]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter((c) => {
      const hay = [c.title, c.description].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [courses, query]);

  const onCreate = (values) => {
    startTransition(async () => {
      const res = await createCourse(values);
      if (!res?.success) {
        toast({
          title: "Nie udało się utworzyć kursu",
          description: res?.error ?? "Wystąpił błąd serwera.",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Kurs utworzony", description: "Możesz teraz dodać moduły i lekcje." });
      router.refresh();
    });
  };

  const onUpdate = (courseId, values) => {
    startTransition(async () => {
      const res = await updateCourse(courseId, values);
      if (!res?.success) {
        toast({
          title: "Nie udało się zapisać zmian",
          description: res?.error ?? "Wystąpił błąd serwera.",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Zapisano zmiany", description: "Kurs został zaktualizowany." });
      router.refresh();
    });
  };

  const onDelete = (courseId) => {
    startTransition(async () => {
      const res = await deleteCourse(courseId);
      if (!res?.success) {
        toast({
          title: "Nie udało się usunąć kursu",
          description: res?.error ?? "Wystąpił błąd serwera.",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Usunięto kurs", description: "Kurs oraz jego moduły i lekcje zostały usunięte." });
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Wyszukaj kurs po tytule lub opisie…"
            className="max-w-md"
          />
        </div>

        <CourseFormDialog
          mode="create"
          trigger={<Button disabled={isPending}>Dodaj kurs</Button>}
          isPending={isPending}
          onSubmit={onCreate}
        />
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tytuł</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Cena</TableHead>
              <TableHead className="hidden md:table-cell">Moduły</TableHead>
              <TableHead className="hidden md:table-cell">Uczestnicy</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Brak kursów do wyświetlenia. Dodaj pierwszy kurs.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((course) => (
                <TableRow key={course.id} className="align-middle">
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <Link
                        href={`/dashboard/kursy/${course.id}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {course.title}
                      </Link>
                      {course.description ? (
                        <span className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {course.description}
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    {course.isPublished ? (
                      <Badge>Opublikowany</Badge>
                    ) : (
                      <Badge variant="secondary">Szkic</Badge>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {typeof course.price === "number"
                      ? course.price.toLocaleString("pl-PL", {
                          style: "currency",
                          currency: "PLN",
                        })
                      : "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {course?._count?.modules ?? 0}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {course?._count?.enrollments ?? 0}
                  </TableCell>
                  <TableCell className="text-right">
                    <CourseRowActions
                      course={course}
                      disabled={isPending}
                      onUpdate={onUpdate}
                      onDelete={onDelete}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

