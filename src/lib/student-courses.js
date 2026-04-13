import { prisma } from '@/lib/prisma'

function lessonsCount(course) {
  return course.modules.reduce((sum, m) => sum + m._count.lessons, 0)
}

/**
 * Kursy ucznia wyłącznie przez Enrollment.
 * @param {string} userId
 * @returns {Promise<{ ok: true, courses: Array } | { ok: false, error: string, courses: [] }>}
 */
export async function getStudentCourses(userId) {
  try {
    const enrollments = await prisma.enrollment.findMany({
      where: { userId },
      include: {
        course: {
          include: {
            modules: {
              select: { _count: { select: { lessons: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const courses = enrollments.map((e) => {
      const progress = Math.min(100, Math.max(0, e.progress))
      return {
        enrollmentId: e.id,
        id: e.course.id,
        title: e.course.title,
        description: e.course.description ?? '',
        lessonsCount: lessonsCount(e.course),
        progress,
        actionLabel: progress >= 100 ? 'Przejrzyj' : 'Kontynuuj',
      }
    })

    return { ok: true, courses }
  } catch (err) {
    console.error('[getStudentCourses]', err)
    return {
      ok: false,
      error:
        'Nie udało się wczytać kursów. Sprawdź połączenie z bazą lub spróbuj ponownie później.',
      courses: [],
    }
  }
}
