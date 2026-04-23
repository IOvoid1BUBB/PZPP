'use server'

import bcrypt from 'bcryptjs'
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

export async function updateStudentPassword(_prevState, formData) {
  const auth = await requireUser()
  if (!auth.ok || !auth.userId) {
    return { success: false, error: auth.error || 'Brak sesji. Zaloguj się ponownie.' }
  }

  const currentPassword = formData.get('currentPassword')?.toString() ?? ''
  const newPassword = formData.get('newPassword')?.toString() ?? ''
  const confirmNewPassword = formData.get('confirmNewPassword')?.toString() ?? ''

  if (!currentPassword || !newPassword || !confirmNewPassword) {
    return {
      success: false,
      error: 'Uzupełnij aktualne hasło, nowe hasło i jego powtórzenie.',
    }
  }

  if (newPassword.length < 8 || confirmNewPassword.length < 8) {
    return { success: false, error: 'Nowe hasło musi mieć co najmniej 8 znaków.' }
  }

  if (newPassword !== confirmNewPassword) {
    return {
      success: false,
      error: "Pole 'Powtórz nowe hasło' musi być równe polu 'Nowe hasło'.",
    }
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, password: true },
    })

    if (!user) {
      return { success: false, error: 'Nie znaleziono użytkownika.' }
    }

    if (!user.password) {
      return {
        success: false,
        error: 'Dla tego konta nie można zmienić hasła tą metodą (brak hasła lokalnego).',
      }
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password)
    if (!isCurrentPasswordValid) {
      return { success: false, error: 'Aktualne hasło jest niepoprawne.' }
    }

    if (currentPassword === newPassword) {
      return { success: false, error: 'Nowe hasło musi różnić się od aktualnego hasła.' }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)

    await prisma.user.update({
      where: { id: auth.userId },
      data: { password: hashedPassword },
    })

    revalidatePath('/student/profil')
    revalidatePath('/student')

    return { success: true, error: null }
  } catch (err) {
    console.error('[updateStudentPassword]', err)
    return {
      success: false,
      error: 'Nie udało się zmienić hasła. Spróbuj ponownie później.',
    }
  }
}
