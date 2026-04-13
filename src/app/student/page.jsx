import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getStudentCourses } from '@/lib/student-courses'
import StudentDashboard from './studentdashboard'

export default async function StudentPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    redirect('/login')
  }
  const result = await getStudentCourses(session.user.id)

  return (
    <StudentDashboard
      courses={result.ok ? result.courses : []}
      errorMessage={result.ok ? null : result.error}
    />
  )
}
