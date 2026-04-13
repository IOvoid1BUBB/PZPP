'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import CourseCard from '@/components/common/CourseCard'

/**
 * @param {{
 *   courses: Array<{ id: string; title: string; description: string; lessonsCount: number; progress: number; actionLabel: string }>
 *   errorMessage?: string | null
 * }} props
 */
export default function StudentDashboard({ courses, errorMessage = null }) {
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (errorMessage) {
      toast({
        variant: 'destructive',
        title: 'Blad',
        description: errorMessage,
      })
    }
  }, [errorMessage, toast])

  const handleOpenCourse = (course) => {
    router.push(`/student/kurs/${course.id}`)
  }

  return (
    <section aria-label="Moje kursy" className="flex-1">
      <h1 className="mb-5 text-5xl font-bold leading-none text-[#0f172a]">Moje kursy</h1>

      {courses.length === 0 && !errorMessage ? (
        <div className="max-w-xl rounded-xl border border-dashed border-muted-foreground/40 bg-muted/30 p-8 text-center">
          <p className="text-base font-medium text-[#0f172a]">Nie masz jeszcze przypisanych kursow</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Po zakupie lub zapisie kurs pojawi sie tutaj automatycznie. W razie pytan skontaktuj sie z administratorem.
          </p>
        </div>
      ) : null}

      {courses.length === 0 && errorMessage ? (
        <p className="text-muted-foreground">Nie udalo sie wczytac listy kursow. Sprobuj odswiezyc strone.</p>
      ) : null}

      {courses.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} onOpenCourse={handleOpenCourse} />
          ))}
        </div>
      ) : null}
    </section>
  )
}
