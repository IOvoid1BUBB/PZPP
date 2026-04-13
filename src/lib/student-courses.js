import { prisma } from '@/lib/prisma'

function lessonsCount(course) {
  return course.modules.reduce((sum, m) => sum + m._count.lessons, 0)
}

/**
 * Kursy, na które użytkownik jest zapisany (Enrollment).
 * @param {string} userId
 */
export async function getEnrolledCoursesForUser(userId) {
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

  return enrollments.map((e) => ({
    id: e.course.id,
    title: e.course.title,
    description: e.course.description ?? '',
    lessonsCount: lessonsCount(e.course),
    actionLabel: 'Kontynuuj',
  }))
}

/**
 * Opublikowane kursy (katalog).
 */
export async function getPublishedCourses() {
  const courses = await prisma.course.findMany({
    where: { isPublished: true },
    include: {
      modules: {
        select: { _count: { select: { lessons: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return courses.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description ?? '',
    lessonsCount: lessonsCount(c),
    actionLabel: 'Kontynuuj',
  }))
}
