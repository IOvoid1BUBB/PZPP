'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/rbac'

export async function updateStudentProfile(_prevState, formData) {
  const auth = await requireUser()
  if (!auth.ok || !auth.userId) {
    return { success: false, error: auth.error || 'Brak sesji. Zaloguj się ponownie.' }
  }

  const firstName = formData.get('firstName')?.toString().trim() ?? ''
  const lastName = formData.get('lastName')?.toString().trim() ?? ''
  const name = [firstName, lastName].filter(Boolean).join(' ').trim()

  if (!name) {
    return { success: false, error: 'Podaj imię lub nazwisko.' }
  }

  try {
    await prisma.user.update({
      where: { id: auth.userId },
      data: { name },
    })
    revalidatePath('/student/profil')
    revalidatePath('/student')
    return { success: true, error: null }
  } catch (err) {
    console.error('[updateStudentProfile]', err)
    return {
      success: false,
      error: 'Nie udało się zapisać zmian. Sprawdź połączenie z bazą lub spróbuj ponownie później.',
    }
  }
}
