'use client'

import { useActionState, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
import { updateStudentProfile } from '@/app/actions/studentProfileActions'
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
  const [state, formAction, pending] = useActionState(updateStudentProfile, initialState)

  useEffect(() => {
    if (state.success) {
      toast({
        title: 'Zapisano',
        description: 'Twoje dane zostały zaktualizowane.',
      })
    }
  }, [state.success, toast])

  return (
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

      <form action={formAction} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">Imię</Label>
            <Input
              id="firstName"
              name="firstName"
              defaultValue={initialFirstName}
              autoComplete="given-name"
              disabled={pending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Nazwisko</Label>
            <Input
              id="lastName"
              name="lastName"
              defaultValue={initialLastName}
              autoComplete="family-name"
              disabled={pending}
            />
          </div>
        </div>

        {state.error ? (
          <p className="text-sm text-destructive" role="alert">
            {state.error}
          </p>
        ) : null}

        <Button type="submit" disabled={pending} className="min-w-[140px]">
          {pending ? 'Zapisywanie…' : 'Zapisz zmiany'}
        </Button>
      </form>
    </div>
  )
}
