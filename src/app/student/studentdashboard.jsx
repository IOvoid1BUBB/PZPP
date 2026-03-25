'use client'

import { useRouter } from 'next/navigation'
import CourseCard from '@/components/common/CourseCard'

/**
 * @param {{
 *   courses: Array<{ id: string; title: string; description: string; lessonsCount: number; actionLabel: string }>
 *   listSource?: 'enrolled' | 'published' | 'published_fallback'
 *   isLoggedIn?: boolean
 * }} props
 */
export default function StudentDashboard({
  courses,
  listSource = 'published',
  isLoggedIn = false,
}) {
  const router = useRouter()

  const handleOpenCourse = (course) => {
    router.push(`/courses/${course.id}`)
  }

  return (
    <section aria-label="Moje kursy" className="flex-1">
      <h1 className="mb-5 text-5xl font-bold leading-none text-[#0f172a]">Moje kursy</h1>

      {listSource === 'published_fallback' && (
        <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
          Nie masz jeszcze zapisów na kursy — poniżej lista opublikowanych kursów z bazy.
        </p>
      )}

      {!isLoggedIn && listSource === 'published' && courses.length > 0 && (
        <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
          Jesteś niezalogowany — widzisz opublikowane kursy. Po zalogowaniu zobaczysz kursy, na które jesteś zapisany.
        </p>
      )}

      {courses.length === 0 ? (
        <p className="text-muted-foreground">
          Brak kursów w bazie (lub żaden nie jest opublikowany). Dodaj kurs w panelu i ustaw{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">isPublished</code>.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} onOpenCourse={handleOpenCourse} />
          ))}
        </div>
      )}
    </section>
  )
}
