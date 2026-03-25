'use client'

import { BookOpen } from 'lucide-react'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function CourseCard({ course, onOpenCourse }) {
  return (
    <article>
      <Card className="h-full overflow-hidden rounded-xl border border-primary/70 bg-[#d8f1e1] shadow-none">
        <div className="p-3 pb-0">
          <div className="relative h-24 w-full overflow-hidden rounded-lg bg-[#b8c2cf] sm:h-28">
            <div className="absolute left-3 top-8 h-4 w-4 rounded-full bg-[#e5e7eb]" />
            <div className="absolute -bottom-8 left-1/2 h-36 w-36 -translate-x-1/2 rounded-full bg-[#e5e7eb]" />
            <div className="absolute -bottom-10 -left-4 h-20 w-20 rounded-full bg-[#e5e7eb]" />
            <div className="absolute -bottom-10 -right-4 h-20 w-20 rounded-full bg-[#e5e7eb]" />
          </div>
        </div>
        <CardContent className="space-y-2 p-3">
          <p className="inline-flex items-center gap-1.5 text-xs text-[#4b5563]">
            <BookOpen className="h-3.5 w-3.5" />
            {course.lessonsCount} lekcji
          </p>
          <h3 className="text-base font-semibold leading-snug text-[#0f172a]">{course.title}</h3>
          <p className="text-sm text-[#0f172a]">
            {course.description?.trim() ? course.description : 'Brak opisu.'}
          </p>
        </CardContent>
        <CardFooter className="px-3 pb-3 pt-0">
          <Button
            type="button"
            size="sm"
            className="h-8 rounded-md bg-[#0f172a] px-3 text-xs font-semibold text-white hover:bg-[#1e293b]"
            onClick={() => onOpenCourse(course)}
          >
            {course.actionLabel}
          </Button>
        </CardFooter>
      </Card>
    </article>
  )
}
