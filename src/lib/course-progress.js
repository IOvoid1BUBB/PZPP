export function calculateCourseProgress(completedLessons, totalLessons) {
  const total = Number.isFinite(totalLessons) ? Math.max(0, Math.floor(totalLessons)) : 0;
  const completedRaw = Number.isFinite(completedLessons)
    ? Math.max(0, Math.floor(completedLessons))
    : 0;

  if (total === 0) return 0;

  const completed = Math.min(completedRaw, total);
  return Math.round((completed / total) * 100);
}

export function calculateDaysSinceEnrollment(enrollmentDate, now = new Date()) {
  if (!enrollmentDate) return 0;
  const start = new Date(enrollmentDate);
  if (Number.isNaN(start.getTime())) return 0;
  const diffMs = now.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

export function getRemainingDripDays(unlockDaysAfterEnrollment, enrollmentDate, now = new Date()) {
  const unlockDays = Number.isFinite(unlockDaysAfterEnrollment)
    ? Math.max(0, Math.floor(unlockDaysAfterEnrollment))
    : 0;
  if (unlockDays === 0) return 0;
  const elapsed = calculateDaysSinceEnrollment(enrollmentDate, now);
  return Math.max(0, unlockDays - elapsed);
}
