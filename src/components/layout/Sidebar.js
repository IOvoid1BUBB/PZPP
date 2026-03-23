'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard,
  LayoutGrid,
  Filter,
  Table2,
  Mail,
  Calendar,
  BookMarked,
  Files,
  Settings,
  LogOut,
  TrendingUp,
} from 'lucide-react'

// Elementy nawigacji
const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pagebuilder', label: 'Page builder', icon: LayoutGrid },
  { href: '/dashboard/lejki', label: 'Lejki', icon: Filter },
  { href: '/dashboard/kanban', label: 'Tablica Kanban', icon: Table2 },
  { href: '/dashboard/skrzynka', label: 'Skrzynka', icon: Mail },
  { href: '/dashboard/kalendarz', label: 'Kalendarz', icon: Calendar },
  { href: '/dashboard/kursy', label: 'Kursy', icon: BookMarked },
  { href: '/dashboard/dokumenty', label: 'Dokumenty', icon: Files },
  { href: '/dashboard/ustawienia', label: 'Ustawienia', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-full min-h-screen flex-col border-r border-sidebar-border bg-sidebar p-4 md:rounded-r-2xl">
      {/* Logo z Navbar */}
      <Link
        href="/dashboard"
        className="mb-8 flex items-center gap-2 rounded-lg p-2 transition-colors hover:bg-sidebar-accent/70"
      >
        <TrendingUp className="size-5 shrink-0 text-sidebar-foreground" />
        <div className="flex flex-col">
          <span className="text-sm font-bold leading-tight text-sidebar-foreground">
            IMS
          </span>
          <span className="text-[10px] leading-tight text-muted-foreground">
            Sprzedażowe centrum dowodzenia
          </span>
        </div>
      </Link>

      {/* Nawigacja */}
      <nav className="flex flex-1 flex-col gap-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground'
              }`}
            >
              <Icon className="h-5 w-5 shrink-0 stroke-[1.5]" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Wyloguj - oddzielony u dołu */}
      <div className="mt-auto border-t border-sidebar-border pt-4">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: '/' })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
        >
          <LogOut className="h-5 w-5 shrink-0 stroke-[1.5]" />
          <span>Wyloguj</span>
        </button>
      </div>
    </aside>
  )
}