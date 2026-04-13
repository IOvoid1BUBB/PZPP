import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import DbErrorToast from '@/components/student/DbErrorToast'
import StudentProfileForm from './StudentProfileForm'

const PROFILE_LOAD_ERROR =
  'Nie udało się wczytać profilu. Sprawdź połączenie z bazą lub spróbuj ponownie później.'

function splitName(full) {
  const s = (full ?? '').trim()
  if (!s) return { firstName: '', lastName: '' }
  const i = s.indexOf(' ')
  if (i === -1) return { firstName: s, lastName: '' }
  return { firstName: s.slice(0, i), lastName: s.slice(i + 1).trim() }
}

export default async function StudentProfilPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    redirect('/login')
  }

  let user
  try {
    user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { _count: { select: { enrollments: true } } },
    })
  } catch (err) {
    console.error('[StudentProfilPage]', err)
    return (
      <section className="mx-auto max-w-lg">
        <DbErrorToast message={PROFILE_LOAD_ERROR} />
        <h1 className="mb-6 text-3xl font-bold text-[#0f172a]">Moje konto</h1>
        <p className="text-sm text-muted-foreground">{PROFILE_LOAD_ERROR}</p>
      </section>
    )
  }

  if (!user) {
    redirect('/login')
  }

  const { firstName, lastName } = splitName(user.name)

  return (
    <section className="mx-auto max-w-lg">
      <h1 className="mb-6 text-3xl font-bold text-[#0f172a]">Moje konto</h1>
      <StudentProfileForm
        email={user.email ?? ''}
        courseCount={user._count.enrollments}
        initialFirstName={firstName}
        initialLastName={lastName}
      />
    </section>
  )
}
