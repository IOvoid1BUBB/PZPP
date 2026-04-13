import { redirect } from 'next/navigation'

/** Stary adres w nawigacji — przekierowanie na profil. */
export default function StudentKontoRedirectPage() {
  redirect('/student/profil')
}
