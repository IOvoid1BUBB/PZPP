"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Bell, TrendingUp, User } from "lucide-react"
import { useSession } from "next-auth/react"

export default function Navbar({ variant = "public" }) {
  const { data: session, status } = useSession()
  const isAuthenticated = status === "authenticated"
  const userRole = session?.user?.role
  const userDisplayName = session?.user?.name || "Konto"
  const accountHref = userRole === "UCZESTNIK" ? "/student" : "/dashboard"

  if (variant === "student") {
    return (
      <header className="w-full border-b border-primary/60 bg-white">
        <div className="flex h-[68px] w-full items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-5 text-[#3f3f46]" />
            <div className="flex flex-col">
              <span className="text-sm font-bold leading-tight text-[#27272a]">IMS</span>
              <span className="text-[10px] leading-tight text-[#71717a]">
                Sprzedażowe centrum
                <br />
                dowodzenia
              </span>
            </div>
          </div>

          <nav className="hidden md:flex">
            <Link
              href="/"
              className="text-sm font-medium text-[#111827] transition-colors hover:text-foreground/80"
            >
              Strona główna
            </Link>
          </nav>

          <div className="flex items-center gap-4 text-[#111827]">
            <button type="button" aria-label="Powiadomienia" className="hover:text-primary">
              <Bell className="size-5" />
            </button>
            <button type="button" aria-label="Profil" className="hover:text-primary">
              <User className="size-5" />
            </button>
            <span className="text-sm">Młody Jan</span>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="absolute top-0 z-50 w-full bg-transparent">
      
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6 relative">
        
       
        <div className="flex items-center gap-2 z-10">
          <TrendingUp className="size-5" />
          <div className="flex flex-col">
            <span className="text-sm font-bold leading-tight">IMS</span>
            <span className="text-[10px] text-muted-foreground leading-tight">
              Sprzedażowe centrum
              <br />
              dowodzenia
            </span>
          </div>
        </div>

       
        <nav className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <Link
            href="/"
            className="text-sm font-medium transition-colors hover:text-foreground/80"
          >
            Strona główna
          </Link>
        </nav>

        
        <div className="flex items-center gap-3 z-10">
          {isAuthenticated ? (
            <Link href={accountHref}>
              <Button variant="ghost" size="sm" className="gap-2">
                <User className="size-4" />
                {userDisplayName}
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button size="sm">Zaloguj się</Button>
              </Link>
              <Link href="/register">
                <Button variant="outline" size="sm" className="bg-transparent">
                  Zarejestruj się
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}