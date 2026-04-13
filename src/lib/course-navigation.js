function normalizeOrder(value) {
  return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
}

export function getOrderedCourseLessons(modules) {
  if (!Array.isArray(modules)) return [];

  return modules
    .slice()
    .sort((a, b) => normalizeOrder(a?.order) - normalizeOrder(b?.order))
    .flatMap((module) =>
      (module?.lessons ?? [])
        .slice()
        .sort((a, b) => normalizeOrder(a?.order) - normalizeOrder(b?.order))
        .map((lesson) => ({
          id: lesson.id,
          moduleId: module.id,
          moduleOrder: normalizeOrder(module.order),
          lessonOrder: normalizeOrder(lesson.order),
        })),
    );
}

export function findNextLessonId(orderedLessons, currentLessonId) {
  if (!Array.isArray(orderedLessons) || !currentLessonId) return null;

  const currentIndex = orderedLessons.findIndex((lesson) => lesson.id === currentLessonId);
  if (currentIndex < 0 || currentIndex + 1 >= orderedLessons.length) return null;

  return orderedLessons[currentIndex + 1]?.id ?? null;
}
