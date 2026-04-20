"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStudentOrAdmin, isAdminRole } from "@/lib/rbac";
import { calculateCourseProgress } from "@/lib/course-progress";
import { upsertLessonCompletionCompat } from "@/lib/lesson-completion-compat";

const PASSING_THRESHOLD = 80;

function normalizeText(value) {
  return String(value ?? "").trim().toLowerCase();
}

function isQuestionCorrect(question, answerValue) {
  if (question.type === "MULTIPLE_CHOICE_ABC") {
    return normalizeText(answerValue).toUpperCase() === normalizeText(question.correctOption).toUpperCase();
  }

  const expected = normalizeText(question.answer);
  if (!expected) return Boolean(normalizeText(answerValue));
  return normalizeText(answerValue) === expected;
}

function isPrismaValidationError(error) {
  return error?.name === "PrismaClientValidationError";
}

async function upsertLessonCompletionWithFallback(db, { enrollmentId, lessonId, score }) {
  try {
    await db.lessonCompletion.upsert({
      where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
      update: { score, passed: true },
      create: { enrollmentId, lessonId, score, passed: true },
    });
  } catch (error) {
    if (error?.code === "P2022") {
      await upsertLessonCompletionCompat(db, enrollmentId, lessonId);
      return;
    }
    if (!isPrismaValidationError(error)) throw error;
    await upsertLessonCompletionCompat(db, enrollmentId, lessonId);
  }
}

function isMissingColumnError(error) {
  if (error?.code === "P2022") return true;
  const msg = String(error?.message ?? "");
  return /does not exist in the current database/i.test(msg);
}

/**
 * Liczy ukończenia quizów z `passed: true`. Poza transakcją — pierwsze zapytanie z brakującą kolumną
 * `passed` nie może abortować `tx` (PostgreSQL 25P02).
 */
async function countPassedQuizCompletionsWithFallback(db, { enrollmentId, quizLessonIds }) {
  try {
    return await db.lessonCompletion.count({
      where: { enrollmentId, passed: true, lessonId: { in: quizLessonIds } },
    });
  } catch (error) {
    if (!isMissingColumnError(error) && !isPrismaValidationError(error)) throw error;
    // Legacy: bez kolumny passed — traktujemy każde ukończenie lekcji-quizu jako zaliczone
    return await db.lessonCompletion.count({
      where: { enrollmentId, lessonId: { in: quizLessonIds } },
    });
  }
}

export async function submitLessonQuiz({ lessonId, answers }) {
  try {
    const auth = await requireStudentOrAdmin();
    if (!auth.ok) return { success: false, error: auth.error };
    if (!lessonId || typeof lessonId !== "string") {
      return { success: false, error: "Nieprawidłowe ID lekcji." };
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: { select: { id: true, courseId: true, order: true } },
        questions: { orderBy: { order: "asc" } },
      },
    });

    if (!lesson) return { success: false, error: "Lekcja nie istnieje." };
    if (!lesson.module?.courseId) return { success: false, error: "Lekcja nie ma przypisanego kursu." };

    const enrollment = isAdminRole(auth.role)
      ? null
      : await prisma.enrollment.findUnique({
          where: { userId_courseId: { userId: auth.userId, courseId: lesson.module.courseId } },
          select: { id: true },
        });

    if (!isAdminRole(auth.role) && !enrollment) {
      return { success: false, error: "Brak dostępu do kursu." };
    }

    const quizQuestions = lesson.questions ?? [];
    if (!quizQuestions.length) {
      return { success: false, error: "Brak pytań quizowych dla tej lekcji." };
    }

    const answersMap = answers && typeof answers === "object" ? answers : {};
    const correctCount = quizQuestions.reduce((sum, question) => {
      const isCorrect = isQuestionCorrect(question, answersMap[question.id]);
      return sum + (isCorrect ? 1 : 0);
    }, 0);
    const score = Math.round((correctCount / quizQuestions.length) * 100);
    const passed = score >= PASSING_THRESHOLD;

    if (!passed) {
      return {
        success: true,
        passed: false,
        score,
        threshold: PASSING_THRESHOLD,
        message: "Quiz niezaliczony. Ukończ quiz, aby odblokować kolejny moduł.",
      };
    }

    if (!isAdminRole(auth.role)) {
      await upsertLessonCompletionWithFallback(prisma, {
        enrollmentId: enrollment.id,
        lessonId,
        score,
      });

      const course = await prisma.course.findUnique({
        where: { id: lesson.module.courseId },
        select: {
          title: true,
          modules: {
            select: {
              id: true,
              lessons: {
                select: {
                  id: true,
                  questions: { select: { id: true } },
                },
              },
            },
          },
        },
      });

      const quizLessonIds = (course?.modules ?? [])
        .flatMap((moduleRow) => moduleRow.lessons ?? [])
        .filter((lessonRow) => (lessonRow.questions ?? []).length > 0)
        .map((lessonRow) => lessonRow.id);

      let passedQuizzesCount = 0;
      if (quizLessonIds.length > 0) {
        passedQuizzesCount = await countPassedQuizCompletionsWithFallback(prisma, {
          enrollmentId: enrollment.id,
          quizLessonIds,
        });
      }

      await prisma.$transaction(async (tx) => {
        const completedLessons = await tx.lessonCompletion.count({
          where: { enrollmentId: enrollment.id },
        });

        const totalLessons = (course?.modules ?? []).reduce(
          (sum, moduleRow) => sum + (moduleRow.lessons?.length ?? 0),
          0,
        );
        const progress = calculateCourseProgress(completedLessons, totalLessons);
        await tx.enrollment.update({ where: { id: enrollment.id }, data: { progress } });

        if (quizLessonIds.length > 0 && passedQuizzesCount === quizLessonIds.length) {
          const certificateTitle = `Certyfikat ukończenia: ${course?.title ?? "Kurs"}`;
          const existingCertificate = await tx.certificate.findFirst({
            where: { userId: auth.userId, title: certificateTitle },
            select: { id: true },
          });
          if (!existingCertificate) {
            await tx.certificate.create({
              data: { userId: auth.userId, title: certificateTitle },
            });
          }
        }
      });
    }

    revalidatePath(`/student/kurs/${lesson.module.courseId}`);
    revalidatePath("/student");

    return { success: true, passed: true, score, threshold: PASSING_THRESHOLD };
  } catch (error) {
    console.error("submitLessonQuiz:", error);
    return { success: false, error: "Nie udało się sprawdzić quizu." };
  }
}
