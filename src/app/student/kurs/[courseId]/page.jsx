import Link from "next/link";
import { notFound } from "next/navigation";
import { getCoursePlayerData } from "@/actions/course";
import { getLessonNotes } from "@/actions/studentLessonNotes";
import { getOrderedCourseLessons, findPreviousLessonId } from "@/lib/course-navigation";
import { Button } from "@/components/ui/button";
import AccessDeniedOverlay from "@/components/course-player/AccessDeniedOverlay";
import CoursePlayer from "@/components/course-player/CoursePlayer";
import CourseSidebar from "@/components/course-player/CourseSidebar";
import LessonQuiz from "@/components/course-player/LessonQuiz";
import NextLessonButton from "@/components/features/courses/NextLessonButton";
import StudentLessonNotesEditor from "@/components/features/courses/StudentLessonNotesEditor";
import StudentCertificateWidget from "@/components/features/courses/StudentCertificateWidget";

function normalizeId(value) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function StudentCoursePage({ params, searchParams }) {
  const resolvedParams = await params;
  const resolvedSearchParams = (await Promise.resolve(searchParams)) || {};
  const courseId = normalizeId(resolvedParams?.courseId);
  const selectedLessonId = normalizeId(resolvedSearchParams?.lessonId);

  const data = await getCoursePlayerData({ courseId, lessonId: selectedLessonId });
  if (!data.success && !data.accessDenied) notFound();

  if (data.accessDenied) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Kurs</h1>
        <AccessDeniedOverlay message={data.error} />
      </div>
    );
  }

  const modules = data.course?.modules ?? [];
  const activeLesson = modules
    .flatMap((moduleItem) => moduleItem.lessons ?? [])
    .find((lesson) => lesson.id === data.activeLessonId);
  if (!activeLesson) notFound();

  let studentNotes = [];
  if (data.viewerUserId) {
    const notesResult = await getLessonNotes(activeLesson.id, data.viewerUserId);
    if (notesResult.success) {
      studentNotes = notesResult.notes ?? [];
    }
  }

  const orderedLessons = getOrderedCourseLessons(modules);
  const previousLessonId = findPreviousLessonId(orderedLessons, data.activeLessonId);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{data.course.title}</h1>
      </header>

      <StudentCertificateWidget courseId={courseId} />

      <main className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <CourseSidebar
          courseId={courseId}
          modules={modules}
          activeLessonId={data.activeLessonId}
          lessonStates={data.lessonStates}
          completedLessonIds={data.passedLessonIds}
          progress={Math.min(100, Math.max(0, data.enrollment?.progress ?? 0))}
        />

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {previousLessonId ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/student/kurs/${courseId}?lessonId=${previousLessonId}`}>
                  ← Poprzednia lekcja
                </Link>
              </Button>
            ) : (
              <Button type="button" variant="outline" size="sm" disabled className="pointer-events-none opacity-50">
                ← Poprzednia lekcja
              </Button>
            )}
            <NextLessonButton courseId={courseId} lessonId={activeLesson.id} />
          </div>

          <CoursePlayer url={activeLesson.videoUrl} title={activeLesson.title} />

          {activeLesson.content ? (
            <article className="prose max-w-none rounded-xl border bg-card p-4">
              {/* eslint-disable-next-line react/no-danger */}
              <div dangerouslySetInnerHTML={{ __html: activeLesson.content }} />
            </article>
          ) : null}

          <LessonQuiz lessonId={activeLesson.id} questions={activeLesson.questions ?? []} />

          <section className="rounded-xl border bg-card p-4">
            <h3 className="text-lg font-semibold">Notatki do lekcji</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Notatki są zapisywane w bazie danych i przypisane do tej lekcji.
            </p>
            <StudentLessonNotesEditor lessonId={activeLesson.id} initialNotes={studentNotes} />
          </section>
        </section>
      </main>
    </div>
  );
}
