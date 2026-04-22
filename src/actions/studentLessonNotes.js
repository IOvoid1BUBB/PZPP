"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStudentOrAdmin } from "@/lib/rbac";

async function getEnrollmentForLesson(userId, lessonId) {
  return prisma.enrollment.findFirst({
    where: {
      userId,
      course: {
        modules: {
          some: {
            lessons: {
              some: { id: lessonId },
            },
          },
        },
      },
    },
    select: { id: true, courseId: true },
  });
}

/**
 * Pobiera notatki użytkownika do lekcji (najnowsze pierwsze).
 */
export async function getLessonNotes(lessonId, userId) {
  try {
    if (!lessonId || typeof lessonId !== "string") {
      return { success: false, error: "Brak wymaganych danych.", notes: [] };
    }

    const auth = await requireStudentOrAdmin();
    if (!auth.ok) return { success: false, error: auth.error, notes: [] };
    const resolvedUserId = auth.userId;

    const notes = await prisma.studentLessonNote.findMany({
      where: { lessonId, userId: resolvedUserId },
      orderBy: { createdAt: "desc" },
      select: { id: true, content: true, createdAt: true },
    });

    return { success: true, notes };
  } catch (error) {
    console.error("getLessonNotes:", error);
    return {
      success: false,
      error: "Nie udało się pobrać notatek.",
      notes: [],
    };
  }
}

/**
 * Dodaje nową notatkę (zawsze nowy rekord).
 */
export async function addLessonNote({ lessonId, content }) {
  try {
    const auth = await requireStudentOrAdmin();
    if (!auth.ok) return { success: false, error: auth.error };
    if (!lessonId || typeof lessonId !== "string") {
      return { success: false, error: "Nieprawidłowe ID lekcji." };
    }

    const normalized = typeof content === "string" ? content.trim() : "";
    if (!normalized) {
      return { success: false, error: "Treść notatki nie może być pusta." };
    }

    const enrollment = await getEnrollmentForLesson(auth.userId, lessonId);
    if (!enrollment) {
      return { success: false, error: "Brak dostępu do tej lekcji." };
    }

    const note = await prisma.studentLessonNote.create({
      data: { userId: auth.userId, lessonId, content: normalized },
      select: { id: true, content: true, createdAt: true },
    });

    revalidatePath(`/student/kurs/${enrollment.courseId}`);
    return { success: true, note };
  } catch (error) {
    console.error("addLessonNote:", error);
    return {
      success: false,
      error:
        typeof error?.message === "string" && error.message.trim()
          ? `Nie udało się zapisać notatki: ${error.message}`
          : "Nie udało się zapisać notatki.",
    };
  }
}

/**
 * Usuwa pojedynczą notatkę (tylko własna).
 */
export async function deleteLessonNote(noteId) {
  try {
    const auth = await requireStudentOrAdmin();
    if (!auth.ok) return { success: false, error: auth.error };
    if (!noteId || typeof noteId !== "string") {
      return { success: false, error: "Nieprawidłowe ID notatki." };
    }

    const existing = await prisma.studentLessonNote.findFirst({
      where: { id: noteId },
      orderBy: { createdAt: "desc" },
      select: {
        userId: true,
        lesson: {
          select: {
            module: { select: { courseId: true } },
          },
        },
      },
    });

    if (!existing) {
      return { success: false, error: "Notatka nie istnieje." };
    }
    if (existing.userId !== auth.userId) {
      return { success: false, error: "Brak uprawnień do usunięcia tej notatki." };
    }

    const courseId = existing.lesson?.module?.courseId;
    await prisma.studentLessonNote.delete({ where: { id: noteId } });

    if (courseId) {
      revalidatePath(`/student/kurs/${courseId}`);
    }
    return { success: true };
  } catch (error) {
    console.error("deleteLessonNote:", error);
    return { success: false, error: "Nie udało się usunąć notatki." };
  }
}
