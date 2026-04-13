'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { upsertStudentLessonNote } from '@/app/actions/studentLessonActions'

export default function StudentLessonNotesEditor({ lessonId, initialValue = '' }) {
  const [value, setValue] = useState(initialValue)
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  const onSave = () => {
    startTransition(async () => {
      const result = await upsertStudentLessonNote({ lessonId, content: value })
      if (!result?.success) {
        toast({
          title: 'Nie udało się zapisać notatki',
          description: result?.error ?? 'Wystąpił błąd serwera.',
          variant: 'destructive',
        })
        return
      }
      toast({ title: 'Notatka zapisana' })
    })
  }

  return (
    <div>
      <Textarea
        className="mt-3 min-h-[220px] resize-y"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Notatki do lekcji..."
      />
      <div className="mt-3 flex justify-end">
        <Button type="button" onClick={onSave} disabled={isPending}>
          {isPending ? 'Zapisywanie...' : 'Zapisz notatkę'}
        </Button>
      </div>
    </div>
  )
}
