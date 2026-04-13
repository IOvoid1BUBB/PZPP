'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireStudentOrAdmin } from '@/lib/rbac'

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
  })
}

export async function upsertStudentLessonNote({ lessonId, content }) {
  try {
    const auth = await requireStudentOrAdmin()
    if (!auth.ok) return { success: false, error: auth.error }
    if (!lessonId || typeof lessonId !== 'string') {
      return { success: false, error: 'Nieprawidłowe ID lekcji.' }
    }

    const normalized = typeof content === 'string' ? content.trim() : ''
    if (!normalized) {
      return { success: false, error: 'Treść notatki nie może być pusta.' }
    }

    const enrollment = await getEnrollmentForLesson(auth.userId, lessonId)
    if (!enrollment) {
      return { success: false, error: 'Brak dostępu do tej lekcji.' }
    }

    await prisma.studentLessonNote.upsert({
      where: { userId_lessonId: { userId: auth.userId, lessonId } },
      update: { content: normalized },
      create: { userId: auth.userId, lessonId, content: normalized },
    })

    revalidatePath(`/student/kurs/${enrollment.courseId}`)
    return { success: true }
  } catch (error) {
    console.error('upsertStudentLessonNote:', error)
    return { success: false, error: 'Nie udało się zapisać notatki.' }
  }
}
