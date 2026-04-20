"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStudentOrAdmin } from "@/lib/rbac";

/**
 * Jednorazowo usuwa stary UNIQUE (userId, lessonId) z bazy z wczesnych migracji,
 * jeśli migracja nie została jeszcze zastosowana na tym środowisku.
 */
async function ensureStudentLessonNoteAllowsMultipleRows() {
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "StudentLessonNote" DROP CONSTRAINT IF EXISTS "StudentLessonNote_userId_lessonId_key";`,
  );
  await prisma.$executeRawUnsafe(
    `DROP INDEX IF EXISTS "StudentLessonNote_userId_lessonId_key";`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "StudentLessonNote_userId_lessonId_idx" ON "StudentLessonNote"("userId", "lessonId");`,
  );
}

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
    if (!lessonId || typeof lessonId !== "string" || !userId) {
      return { success: false, error: "Brak wymaganych danych.", notes: [] };
    }

    const auth = await requireStudentOrAdmin();
    if (!auth.ok) return { success: false, error: auth.error, notes: [] };
    if (auth.userId !== userId) {
      return { success: false, error: "Brak uprawnień do tych notatek.", notes: [] };
    }

    const notes = await prisma.studentLessonNote.findMany({
      where: { lessonId, userId },
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

    let note;
    try {
      note = await prisma.studentLessonNote.create({
        data: { userId: auth.userId, lessonId, content: normalized },
        select: { id: true, content: true, createdAt: true },
      });
    } catch (firstError) {
      if (firstError?.code !== "P2002") throw firstError;
      console.warn(
        "[addLessonNote] P2002 — usuwam stary UNIQUE index i ponawiam zapis (migracja nie była na tej bazie).",
      );
      await ensureStudentLessonNoteAllowsMultipleRows();
      note = await prisma.studentLessonNote.create({
        data: { userId: auth.userId, lessonId, content: normalized },
        select: { id: true, content: true, createdAt: true },
      });
    }

    revalidatePath(`/student/kurs/${enrollment.courseId}`);
    return { success: true, note };
  } catch (error) {
    console.error("addLessonNote:", error);
    if (error?.code === "P2002") {
      return {
        success: false,
        error:
          "Nadal unikalność (userId + lessonId). Sprawdź uprawnienia DB do DROP INDEX lub uruchom: npx prisma migrate deploy",
      };
    }
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

    const existing = await prisma.studentLessonNote.findUnique({
      where: { id: noteId },
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
