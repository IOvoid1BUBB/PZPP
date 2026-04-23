'use client'

import { useActionState, useEffect, useRef } from 'react'
import { useToast } from '@/hooks/use-toast'
import {
  updateStudentPassword,
  updateStudentProfile,
} from '@/app/actions/studentProfileActions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const initialState = { success: false, error: null }

export default function StudentProfileForm({
  email,
  courseCount,
  initialFirstName,
  initialLastName,
}) {
  const { toast } = useToast()
  const passwordFormRef = useRef(null)
  const [profileState, profileFormAction, profilePending] = useActionState(
    updateStudentProfile,
    initialState
  )
  const [passwordState, passwordFormAction, passwordPending] = useActionState(
    updateStudentPassword,
    initialState
  )

  useEffect(() => {
    if (profileState.success) {
      toast({
        title: 'Zapisano',
        description: 'Twoje dane zostały zaktualizowane.',
      })
    }
  }, [profileState.success, toast])

  useEffect(() => {
    if (passwordState.success) {
      passwordFormRef.current?.reset()
      toast({
        title: 'Hasło zmienione',
        description: 'Twoje hasło zostało pomyślnie zaktualizowane.',
      })
    }
  }, [passwordState.success, toast])

  useEffect(() => {
    if (passwordState.error) {
      toast({
        variant: 'destructive',
        title: 'Błąd zmiany hasła',
        description: passwordState.error,
      })
    }
  }, [passwordState.error, toast])

  return (
    <div className="space-y-6">
      <div className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-muted-foreground">E-mail</dt>
            <dd className="font-medium text-[#0f172a]">{email || '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Liczba kursów</dt>
            <dd className="font-medium text-[#0f172a]">{courseCount}</dd>
          </div>
        </dl>

        <form action={profileFormAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">Imię</Label>
              <Input
                id="firstName"
                name="firstName"
                defaultValue={initialFirstName}
                autoComplete="given-name"
                disabled={profilePending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Nazwisko</Label>
              <Input
                id="lastName"
                name="lastName"
                defaultValue={initialLastName}
                autoComplete="family-name"
                disabled={profilePending}
              />
            </div>
          </div>

          {profileState.error ? (
            <p className="text-sm text-destructive" role="alert">
              {profileState.error}
            </p>
          ) : null}

          <Button type="submit" disabled={profilePending} className="min-w-[140px]">
            {profilePending ? 'Zapisywanie…' : 'Zapisz zmiany'}
          </Button>
        </form>
      </div>

      <div className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-[#0f172a]">Zmiana hasła</h2>
          <p className="text-sm text-muted-foreground">
            Podaj aktualne hasło, aby ustawić nowe.
          </p>
        </div>

        <form ref={passwordFormRef} action={passwordFormAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Aktualne hasło</Label>
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              disabled={passwordPending}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nowe hasło</Label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                disabled={passwordPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmNewPassword">Powtórz nowe hasło</Label>
              <Input
                id="confirmNewPassword"
                name="confirmNewPassword"
                type="password"
                autoComplete="new-password"
                disabled={passwordPending}
              />
            </div>
          </div>

          {passwordState.error ? (
            <p className="text-sm text-destructive" role="alert">
              {passwordState.error}
            </p>
          ) : null}

          <Button type="submit" disabled={passwordPending} className="min-w-[140px]">
            {passwordPending ? 'Zapisywanie…' : 'Zmień hasło'}
          </Button>
        </form>
      </div>
    </div>
  )
}
