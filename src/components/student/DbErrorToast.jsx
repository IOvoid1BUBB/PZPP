'use client'

import { useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'

/** Wyświetla toast przy błędzie po stronie serwera (np. baza niedostępna). */
export default function DbErrorToast({ message }) {
  const { toast } = useToast()

  useEffect(() => {
    if (message) {
      toast({
        variant: 'destructive',
        title: 'Błąd',
        description: message,
      })
    }
  }, [message, toast])

  return null
}
