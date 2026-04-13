export function calculateCourseProgress(completedLessons, totalLessons) {
  const total = Number.isFinite(totalLessons) ? Math.max(0, Math.floor(totalLessons)) : 0;
  const completedRaw = Number.isFinite(completedLessons)
    ? Math.max(0, Math.floor(completedLessons))
    : 0;

  if (total === 0) return 0;

  const completed = Math.min(completedRaw, total);
  return Math.round((completed / total) * 100);
}
