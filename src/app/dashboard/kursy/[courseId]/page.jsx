import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import CourseModulesManager from "@/components/features/courses/CourseModulesManager";
import { requireCreatorOrAdmin, isAdminRole } from "@/lib/rbac";

export default async function CourseDetailsPage({ params }) {
  const { courseId } = await params;
  if (!courseId || typeof courseId !== "string") notFound();

  const auth = await requireCreatorOrAdmin();
  if (!auth.ok) notFound();

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      title: true,
      isPublished: true,
      authorId: true,
      modules: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          order: true,
          courseId: true,
          lessons: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              title: true,
              order: true,
              videoUrl: true,
              videoText: true,
              content: true,
              resources: {
                orderBy: { order: "asc" },
                select: {
                  id: true,
                  type: true,
                  title: true,
                  url: true,
                  order: true,
                },
              },
              questions: {
                orderBy: { order: "asc" },
                select: {
                  id: true,
                  lessonId: true,
                  question: true,
                  type: true,
                  answer: true,
                  optionA: true,
                  optionB: true,
                  optionC: true,
                  correctOption: true,
                  order: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!course) notFound();
  if (!isAdminRole(auth.role) && course.authorId !== auth.userId) notFound();

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{course.title}</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Zarządzaj modułami i lekcjami wewnątrz kursu.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/kursy">Wróć do listy kursów</Link>
        </Button>
      </header>

      <CourseModulesManager course={course} />
    </section>
  );
}

