"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { TrendingUp } from "lucide-react"

export default function Navbar() {
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
          <Link href="/login">
            <Button size="sm">Zaloguj się</Button>
          </Link>
          <Link href="/register">
            <Button variant="outline" size="sm" className="bg-transparent">
              Zarejestruj się
            </Button>
          </Link>
        </div>
      </div>
    </header>
  )
}