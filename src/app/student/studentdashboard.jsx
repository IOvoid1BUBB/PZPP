'use client'

import { useMemo } from 'react'
import CourseCard from '@/components/common/CourseCard'

const COURSES_IN_PROGRESS = [
  {
    id: 'course-methods',
    title: 'Kurs szydełkowania',
    description: 'Naucz się jak sprawnie wytwarzać swetry bawełniane',
    lessonsCount: 12,
    actionLabel: 'Kontynuuj',
  },
  {
    id: 'course-sql',
    title: 'Kurs szydełkowania',
    description: 'Naucz się jak sprawnie wytwarzać swetry bawełniane',
    lessonsCount: 12,
    actionLabel: 'Kontynuuj',
  },
  {
    id: 'course-teamwork',
    title: 'Kurs szydełkowania',
    description: 'Naucz się jak sprawnie wytwarzać swetry bawełniane',
    lessonsCount: 12,
    actionLabel: 'Kontynuuj',
  },
]

export default function StudentDashboard() {
  const courses = useMemo(() => COURSES_IN_PROGRESS, [])

  const handleOpenCourse = (course) => {
    console.info(`Przejście do kursu: ${course.id}`)
  }

  return (
    <section aria-label="Moje kursy" className="flex-1">
      <h1 className="mb-5 text-5xl font-bold leading-none text-[#0f172a]">Moje kursy</h1>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {courses.map((course) => (
          <CourseCard key={course.id} course={course} onOpenCourse={handleOpenCourse} />
        ))}
      </div>
    </section>
  )
}
