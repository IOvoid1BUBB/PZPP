import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import {
  getEnrolledCoursesForUser,
  getPublishedCourses,
} from '@/lib/student-courses'
import StudentDashboard from './studentdashboard'

export default async function StudentPage() {
  const session = await getServerSession(authOptions)

  let courses = []
  let listSource = 'published'

  if (session?.user?.id) {
    const enrolled = await getEnrolledCoursesForUser(session.user.id)
    if (enrolled.length > 0) {
      courses = enrolled
      listSource = 'enrolled'
    }
  }

  if (courses.length === 0) {
    courses = await getPublishedCourses()
    listSource = session?.user?.id ? 'published_fallback' : 'published'
  }

  return (
    <StudentDashboard
      courses={courses}
      listSource={listSource}
      isLoggedIn={Boolean(session?.user?.id)}
    />
  )
}
