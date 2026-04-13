'use client'

import { useEffect, useId, useState } from 'react'
import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
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
  IdCard,
  User,
  Menu,
  X,
} from 'lucide-react'
import StudentCertificateWidget from '@/components/features/courses/StudentCertificateWidget'

// Elementy nawigacji
const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/pagebuilder', label: 'Page builder', icon: LayoutGrid },
  { href: '/dashboard/lejki', label: 'Lejki', icon: Filter },
  { href: '/dashboard/kanban', label: 'Tablica Kanban', icon: Table2 },
  { href: '/dashboard/skrzynka', label: 'Skrzynka', icon: Mail },
  { href: '/dashboard/calendar', label: 'Kalendarz', icon: Calendar },
  { href: '/dashboard/kursy', label: 'Kursy', icon: BookMarked },
  { href: '/dashboard/dokumenty', label: 'Dokumenty', icon: Files },
  { href: '/dashboard/ustawienia', label: 'Ustawienia', icon: Settings },
]

const STUDENT_NAV_ITEMS = [
  { href: '/student', label: 'Wszystkie kursy', icon: IdCard },
  { href: '/student/skrzynka', label: 'Skrzynka', icon: Mail },
  { href: '/student/konto', label: 'Moje konto', icon: User },
]

function SidebarBrand({ className = '', onNavigate, logoHref }) {
  return (
    <Link
      href={logoHref}
      onClick={onNavigate}
      className={`mb-8 flex items-center gap-2 rounded-lg p-2 transition-colors hover:bg-sidebar-accent/70 ${className}`}
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
  )
}

function NavLinks({ pathname, onItemClick, isStudentRoute }) {
  const navItems = isStudentRoute ? STUDENT_NAV_ITEMS : NAV_ITEMS

  const isNavActive = (href) => {
    if (isStudentRoute) {
      if (href === '/student') {
        return pathname === '/student' || pathname === '/student/'
      }
      return pathname === href || pathname.startsWith(`${href}/`)
    }
    return pathname === href
  }

  return (
    <>
      {navItems.map((item) => {
        const isActive = isNavActive(item.href)
        const Icon = item.icon

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onItemClick}
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
    </>
  )
}

function LogoutButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
    >
      <LogOut className="h-5 w-5 shrink-0 stroke-[1.5]" />
      <span>Wyloguj</span>
    </button>
  )
}

function resolveCourseIdFromPath(pathname, paramsCourseId) {
  if (typeof paramsCourseId === 'string' && paramsCourseId.length > 0) return paramsCourseId
  if (!pathname.startsWith('/student/kurs/')) return null

  const parts = pathname.split('/')
  const idx = parts.findIndex((part) => part === 'kurs')
  if (idx < 0) return null
  return parts[idx + 1] || null
}

export default function Sidebar({ isStudentLayout = false }) {
  const pathname = usePathname()
  const params = useParams()
  const panelId = useId()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isStudentRoute = isStudentLayout || pathname.startsWith('/student')
  const logoHref = isStudentRoute ? '/student' : '/dashboard'
  const courseId = isStudentRoute
    ? resolveCourseIdFromPath(pathname, Array.isArray(params?.courseId) ? params.courseId[0] : params?.courseId)
    : null

  const closeMobile = () => setMobileOpen(false)

  useEffect(() => {
    closeMobile()
  }, [pathname])

  useEffect(() => {
    if (!mobileOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') closeMobile()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [mobileOpen])

  return (
    <>
      {/* Górny pasek — tylko mobile */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-sidebar-border bg-sidebar px-3 shadow-sm md:hidden">
        <button
          type="button"
          aria-expanded={mobileOpen}
          aria-controls={panelId}
          aria-label={mobileOpen ? 'Zamknij menu' : 'Otwórz menu'}
          onClick={() => setMobileOpen((o) => !o)}
          className="flex size-10 items-center justify-center rounded-lg text-sidebar-foreground transition-colors hover:bg-sidebar-accent/70"
        >
          {mobileOpen ? (
            <X className="size-6 stroke-[1.5]" />
          ) : (
            <Menu className="size-6 stroke-[1.5]" />
          )}
        </button>
        <Link
          href={logoHref}
          className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-sidebar-accent/70"
        >
          <TrendingUp className="size-5 shrink-0 text-sidebar-foreground" />
          <span className="truncate text-sm font-bold text-sidebar-foreground">
            IMS
          </span>
        </Link>
        <span className="size-10 shrink-0" aria-hidden />
      </header>

      {/* Odstęp pod fixed header — tylko mobile */}
      <div className="h-14 shrink-0 md:hidden" aria-hidden />

      {/* Desktop */}
      <aside className="hidden h-full min-h-screen flex-col border-r border-sidebar-border bg-sidebar p-4 md:flex md:rounded-r-2xl">
        <SidebarBrand logoHref={logoHref} />
        <nav className="flex flex-1 flex-col gap-2">
          <NavLinks pathname={pathname} isStudentRoute={isStudentRoute} />
          {isStudentRoute ? <StudentCertificateWidget courseId={courseId} /> : null}
        </nav>
        <div className="mt-auto border-t border-sidebar-border pt-4">
          <LogoutButton onClick={() => signOut({ callbackUrl: '/' })} />
        </div>
      </aside>

      {/* Panel boczny — mobile */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden" role="presentation">
          <button
            type="button"
            aria-label="Zamknij menu"
            className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
            onClick={closeMobile}
          />
          <aside
            id={panelId}
            className="absolute inset-y-0 left-0 flex w-[min(18rem,88vw)] flex-col border-r border-sidebar-border bg-sidebar p-4 shadow-xl animate-in slide-in-from-left duration-200"
          >
            <div className="mb-4 flex items-center justify-between md:hidden">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Menu
              </span>
              <button
                type="button"
                aria-label="Zamknij menu"
                onClick={closeMobile}
                className="flex size-9 items-center justify-center rounded-lg text-sidebar-foreground transition-colors hover:bg-sidebar-accent/70"
              >
                <X className="size-5 stroke-[1.5]" />
              </button>
            </div>
            <SidebarBrand className="mb-6" onNavigate={closeMobile} logoHref={logoHref} />
            <nav className="flex flex-1 flex-col gap-2 overflow-y-auto">
              <NavLinks pathname={pathname} onItemClick={closeMobile} isStudentRoute={isStudentRoute} />
              {isStudentRoute ? <StudentCertificateWidget courseId={courseId} /> : null}
            </nav>
            <div className="mt-auto border-t border-sidebar-border pt-4">
              <LogoutButton onClick={() => signOut({ callbackUrl: '/' })} />
            </div>
          </aside>
        </div>
      ) : null}
    </>
  )
}