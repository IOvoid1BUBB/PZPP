import Link from "next/link";
import { CheckCircle2, Lock, PlayCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function CourseSidebar({
  courseId,
  modules,
  activeLessonId,
  lessonStates,
  completedLessonIds = [],
  progress = 0,
}) {
  const stateByLessonId = new Map((lessonStates ?? []).map((item) => [item.lessonId, item]));
  const completedSet = new Set(completedLessonIds);

  return (
    <aside className="space-y-4 rounded-xl border bg-card p-4">
      <div>
        <p className="text-sm text-muted-foreground">Postęp kursu</p>
        <p className="text-xl font-semibold">{progress}%</p>
        <Progress value={progress} className="mt-2 h-2" />
      </div>

      <div className="space-y-3">
        {(modules ?? []).map((moduleItem) => (
          <details key={moduleItem.id} open className="rounded-lg border p-2">
            <summary className="cursor-pointer text-sm font-semibold">{moduleItem.title}</summary>
            <ol className="mt-2 space-y-1">
              {(moduleItem.lessons ?? []).map((lesson) => {
                const lessonState = stateByLessonId.get(lesson.id) ?? { isLocked: false, remainingDays: 0 };
                const isActive = activeLessonId === lesson.id;
                const isCompleted = completedSet.has(lesson.id);
                const label = lessonState.isLocked
                  ? lessonState.lockedByModuleQuiz
                    ? "Najpierw zalicz quiz poprzedniego modułu"
                    : `Dostępne za ${lessonState.remainingDays} dni`
                  : lesson.title;

                return (
                  <li key={lesson.id}>
                    {lessonState.isLocked ? (
                      <div className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground opacity-70">
                        <Lock className="size-4" />
                        <span className="truncate">{label}</span>
                      </div>
                    ) : (
                      <Link
                        href={`/student/kurs/${courseId}?lessonId=${lesson.id}`}
                        className={[
                          "flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted",
                          isActive ? "bg-muted font-medium" : "",
                        ].join(" ")}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="size-4 text-green-600" />
                        ) : (
                          <PlayCircle className="size-4 text-primary" />
                        )}
                        <span className="truncate">{lesson.title}</span>
                      </Link>
                    )}
                  </li>
                );
              })}
            </ol>
          </details>
        ))}
      </div>
    </aside>
  );
}
