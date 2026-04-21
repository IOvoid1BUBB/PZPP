import { randomUUID } from "node:crypto";

/**
 * Upsert ukończenia lekcji (stara baza bez score/passed vs pełny model Prisma).
 *
 * **Ważne:** przy błędzie P2022 wykonywany jest drugi krok (`$executeRaw`). W PostgreSQL
 * po błędzie w tej samej transakcji stan to `aborted` (25P02) — dlatego **zawsze**
 * przekazuj tutaj główny klient `prisma`, a nie `tx` z wewnątrz `$transaction`,
 * jeśli wcześniej w tej samej transakcji mógł paść inny SQL.
 */
export async function upsertLessonCompletionCompat(db, enrollmentId, lessonId) {
  try {
    await db.lessonCompletion.upsert({
      where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
      update: {},
      create: { enrollmentId, lessonId },
    });
  } catch (error) {
    if (error?.code !== "P2022") throw error;
    const id = randomUUID();
    await db.$executeRaw`
      INSERT INTO "LessonCompletion" ("id", "enrollmentId", "lessonId", "completedAt")
      VALUES (${id}, ${enrollmentId}, ${lessonId}, NOW())
      ON CONFLICT ("enrollmentId", "lessonId") DO NOTHING
    `;
  }
}
