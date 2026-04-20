-- Pozwól na wiele notatek na lekcję i użytkownika (usuń unikalny indeks z init).
-- Zastąp go zwykłym indeksem zgodnie ze schema.prisma: @@index([userId, lessonId])

DROP INDEX IF EXISTS "StudentLessonNote_userId_lessonId_key";

CREATE INDEX IF NOT EXISTS "StudentLessonNote_userId_lessonId_idx" ON "StudentLessonNote"("userId", "lessonId");
