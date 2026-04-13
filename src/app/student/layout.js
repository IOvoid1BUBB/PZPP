'use client'

import { usePathname } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import { Toaster } from '@/components/ui/toaster'

export default function StudentLayout({ children }) {
  const pathname = usePathname()
  const isCourseRoute = pathname?.startsWith('/student/kurs/')

  return (
    <div className="flex min-h-dvh flex-col bg-[#efefef]">
      <div
        className={[
          'grid min-h-0 flex-1 grid-cols-1 grid-rows-[auto_minmax(0,1fr)] md:grid-rows-1 md:min-h-0',
          isCourseRoute ? 'md:grid-cols-1' : 'md:grid-cols-[1fr_4fr]',
        ].join(' ')}
      >
        {!isCourseRoute ? (
          <div className="min-w-0 md:flex md:h-full md:min-h-0 md:flex-col">
            <Sidebar isStudentLayout />
          </div>
        ) : null}
        <div
          className={[
            'flex min-h-0 min-w-0 flex-col overflow-y-auto bg-background',
            isCourseRoute ? 'px-4 pt-4 md:px-6 md:pt-6' : 'px-6 pt-8 md:h-full md:pt-10',
          ].join(' ')}
        >
          {children}
        </div>
      </div>
      <Toaster />
    </div>
  )
}
