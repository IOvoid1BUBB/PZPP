"use server";

import { prisma } from "@/lib/prisma";
import { requireStudentOrAdmin, isAdminRole } from "@/lib/rbac";
import { getRemainingDripDays } from "@/lib/course-progress";

function normalizeId(value) {
  return Array.isArray(value) ? value[0] : value;
}

function getFlatLessons(modules) {
  return (modules ?? []).flatMap((module) =>
    (module.lessons ?? []).map((lesson) => ({
      ...lesson,
      moduleTitle: module.title,
      moduleOrder: module.order,
      unlockDaysAfterEnrollment: module.unlockDaysAfterEnrollment ?? 0,
    })),
  );
}

function normalizeOrder(value) {
  return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
}

function isMissingColumnError(error) {
  return (
    error?.name === "PrismaClientKnownRequestError" &&
    typeof error?.message === "string" &&
    error.message.includes("does not exist in the current database")
  );
}

async function getCourseWithFallback(normalizedCourseId) {
  try {
    return await prisma.course.findUnique({
      where: { id: normalizedCourseId },
      include: {
        modules: {
          orderBy: { order: "asc" },
          include: {
            lessons: {
              orderBy: { order: "asc" },
              include: {
                resources: { orderBy: { order: "asc" } },
                questions: { orderBy: { order: "asc" } },
              },
            },
          },
        },
      },
    });
  } catch (error) {
    if (!isMissingColumnError(error)) throw error;

    // Backward compatibility if DB is missing newer scalar columns.
    const legacyCourse = await prisma.course.findUnique({
      where: { id: normalizedCourseId },
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        isPublished: true,
        createdAt: true,
        updatedAt: true,
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
              include: {
                resources: { orderBy: { order: "asc" } },
                questions: { orderBy: { order: "asc" } },
              },
            },
          },
        },
      },
    });

    if (!legacyCourse) return null;

    return {
      ...legacyCourse,
      modules: (legacyCourse.modules ?? []).map((moduleItem) => ({
        ...moduleItem,
        unlockDaysAfterEnrollment: 0,
      })),
    };
  }
}

async function getEnrollmentPassedCompletions(enrollmentId) {
  if (!enrollmentId) return [];

  try {
    return await prisma.lessonCompletion.findMany({
      where: { enrollmentId },
      select: { lessonId: true, passed: true },
    });
  } catch (error) {
    // Backward compatibility before prisma migrate/generate adds `passed`.
    if (error?.name === "PrismaClientValidationError" || isMissingColumnError(error)) {
      const completions = await prisma.lessonCompletion.findMany({
        where: { enrollmentId },
        select: { lessonId: true },
      });
      return completions.map((item) => ({ lessonId: item.lessonId, passed: true }));
    }
    throw error;
  }
}

export async function checkCourseAccess(courseId, userId) {
  try {
    const normalizedCourseId = normalizeId(courseId);
    if (!normalizedCourseId) {
      return { hasAccess: false, reason: "Nieprawidłowe ID kursu." };
    }

    const auth = await requireStudentOrAdmin();
    if (!auth.ok) return { hasAccess: false, reason: auth.error };
    const requestedUserId = typeof userId === "string" && userId.trim() ? userId : null;
    const targetUserId = isAdminRole(auth.role) && requestedUserId ? requestedUserId : auth.userId;
    if (isAdminRole(auth.role)) {
      return { hasAccess: true, isAdmin: true, viewerUserId: auth.userId ?? targetUserId ?? null };
    }
    if (!targetUserId) return { hasAccess: false, reason: "Brak użytkownika." };

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: targetUserId, courseId: normalizedCourseId } },
      select: { id: true, createdAt: true, progress: true },
    });

    if (!enrollment) {
      return { hasAccess: false, reason: "Brak aktywnego przypisania do kursu." };
    }

    return { hasAccess: true, enrollment, viewerUserId: auth.userId };
  } catch (error) {
    console.error("checkCourseAccess:", error);
    return { hasAccess: false, reason: "Nie udało się zweryfikować dostępu." };
  }
}

export async function getCoursePlayerData({ courseId, lessonId }) {
  try {
    const normalizedCourseId = normalizeId(courseId);
    const normalizedLessonId = normalizeId(lessonId);
    const access = await checkCourseAccess(normalizedCourseId);

    if (!access.hasAccess) {
      return { success: false, error: access.reason, accessDenied: true };
    }

    const course = await getCourseWithFallback(normalizedCourseId);

    if (!course?.isPublished && !access.isAdmin) {
      return { success: false, error: "Kurs nie jest opublikowany.", accessDenied: true };
    }

    const flatLessons = getFlatLessons(course?.modules);
    const enrollmentCompletions = await getEnrollmentPassedCompletions(access.enrollment?.id);
    const passedLessonSet = new Set(
      enrollmentCompletions.filter((item) => item.passed).map((item) => item.lessonId),
    );

    const moduleUnlockMap = new Map();
    const orderedModules = [...(course.modules ?? [])].sort(
      (a, b) => normalizeOrder(a.order) - normalizeOrder(b.order),
    );
    let previousModulesQuizPassed = true;
    for (const moduleItem of orderedModules) {
      moduleUnlockMap.set(moduleItem.id, previousModulesQuizPassed);
      const quizLessons = (moduleItem.lessons ?? []).filter((lesson) => (lesson.questions ?? []).length > 0);
      const modulePassed =
        quizLessons.length === 0 || quizLessons.every((lesson) => passedLessonSet.has(lesson.id));
      previousModulesQuizPassed = previousModulesQuizPassed && modulePassed;
    }

    const lessonStates = flatLessons.map((lesson) => {
      const remainingDays = access.isAdmin
        ? 0
        : getRemainingDripDays(lesson.unlockDaysAfterEnrollment, access.enrollment.createdAt);
      const lockedByModuleQuiz = access.isAdmin ? false : !moduleUnlockMap.get(lesson.moduleId);
      return {
        lessonId: lesson.id,
        isLocked: remainingDays > 0 || lockedByModuleQuiz,
        lockedByModuleQuiz,
        remainingDays,
      };
    });

    const firstUnlocked = lessonStates.find((item) => !item.isLocked)?.lessonId ?? flatLessons[0]?.id;
    const requested = flatLessons.find((lesson) => lesson.id === normalizedLessonId);
    const requestedState = lessonStates.find((s) => s.lessonId === requested?.id);
    const activeLessonId =
      requested && requestedState && !requestedState.isLocked ? requested.id : firstUnlocked;
    const activeLesson = flatLessons.find((lesson) => lesson.id === activeLessonId) ?? null;

    return {
      success: true,
      accessDenied: false,
      course,
      activeLessonId,
      lessonStates,
      enrollment: access.enrollment ?? null,
      passedLessonIds: [...passedLessonSet],
      viewerUserId: access.viewerUserId ?? null,
    };
  } catch (error) {
    console.error("getCoursePlayerData:", error);
    return { success: false, error: "Nie udało się pobrać danych kursu." };
  }
}
