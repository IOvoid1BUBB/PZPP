import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import {
  Bell,
  BookMarked,
  Check,
  GraduationCap,
  Lock,
  Play,
  PlayCircle,
  Search,
  User,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import CourseYouTubePlayer from '@/components/course/CourseYouTubePlayer'

function getNormalizedId(courseIdParam) {
  return Array.isArray(courseIdParam) ? courseIdParam[0] : courseIdParam
}

export default async function StudentCoursePage({ params }) {
  const { courseId } = await params
  const normalizedCourseId = getNormalizedId(courseId)

  const devMode =
    process.env.NEXT_PUBLIC_COURSE_DEV_MODE === 'true' ||
    process.env.NEXT_PUBLIC_DEV_MODE === 'true' ||
    process.env.NODE_ENV !== 'production'

  // Wymaganie: pobierz tytuł kursu z Prisma po id, a resztę trzymaj jako mock.
  const course = await prisma.course.findUnique({
    where: { id: normalizedCourseId },
  })

  if (!course) notFound()
  if (!course.isPublished && !devMode) notFound()

  // Mock struktury pod przyszłe dynamiczne ładowanie.
  // Wymaganie: zamiast "kurs szydełkowania" wyświetl "relacyjne bazy danych".
  const courseTitle =
    course.title && /szyde(ł)?l?k|szydelk/i.test(course.title)
      ? 'relacyjne bazy danych'
      : course.title || 'relacyjne bazy danych'
  const mockModules = [
    {
      id: 'm1',
      title: 'Moduł: Wprowadzenie do SQL',
      lessons: [
        { number: 1, title: 'Lekcja 1: Czym jest SQL?', status: 'completed' },
        { number: 2, title: 'Lekcja 2: Pierwsze zapytania SELECT', status: 'locked' },
        { number: 3, title: 'Lekcja 3: Aliasy i sortowanie', status: 'completed' },
        { number: 4, title: 'Lekcja 4: Filtrowanie WHERE', status: 'locked' },
        { number: 5, title: 'Lekcja 5: Grupowanie GROUP BY', status: 'locked' },
        { number: 6, title: 'Lekcja 6: Podstawy agregacji', status: 'locked' },
      ],
    },
    {
      id: 'm2',
      title: 'Moduł: Modelowanie danych',
      lessons: [
        { number: 1, title: 'Lekcja 1: Encje i atrybuty', status: 'locked' },
        { number: 2, title: 'Lekcja 2: Schemat relacyjny', status: 'locked' },
        { number: 3, title: 'Lekcja 3: Normalizacja (intuicja)', status: 'locked' },
        { number: 4, title: 'Lekcja 4: Indeksy i wydajność', status: 'locked' },
        { number: 5, title: 'Lekcja 5: Integralność danych', status: 'locked' },
        { number: 6, title: 'Lekcja 6: Case study schematu', status: 'locked' },
      ],
    },
    {
      id: 'm3',
      title: 'Moduł: Relacje i klucze obce',
      lessons: [
        { number: 1, title: 'Lekcja 1: Klucze podstawowe (PK)', status: 'completed' },
        {
          number: 2,
          title: 'Lekcja 2: Relacje jeden-do-wielu (FK)',
          status: 'active',
        },
        { number: 3, title: 'Lekcja 3: Ograniczenia i spójność', status: 'completed' },
        { number: 4, title: 'Lekcja 4: Relacje wiele-do-wielu', status: 'locked' },
        { number: 5, title: 'Lekcja 5: JOINy w praktyce', status: 'locked' },
        { number: 6, title: 'Lekcja 6: Zadania praktyczne', status: 'locked' },
      ],
    },
  ]

  const activeModule =
    mockModules.find((m) => m.title === 'Moduł: Relacje i klucze obce') || mockModules[2]
  const activeLesson = activeModule.lessons.find((l) => l.status === 'active')
  const videoTitle = activeLesson
    ? `${activeModule.title}: ${activeLesson.title}`
    : 'Moduł: Relacje i klucze obce: Relacje jeden-do-wielu (FK)'

  const completedPercent = 25

  return (
    <div className="space-y-6">
      {/* Header (odwzorowanie z obrazka) */}
      <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-xl border border-[#e5e7eb] bg-white px-5 py-3">
        <div className="flex items-center gap-4">
          <Link
            href="/student"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#0f172a] hover:text-primary"
          >
            <BookMarked className="size-4" />
            Katalog kursów
          </Link>
          <Link
            href="/student"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#0f172a] hover:text-primary"
          >
            <GraduationCap className="size-4" />
            Moje kursy
          </Link>
        </div>

        <div className="flex items-center justify-center">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-9 items-center justify-center rounded-lg bg-[#e2fbe8] text-primary">
              <PlayCircle className="size-5" />
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            aria-label="Powiadomienia"
            className="rounded-md p-2 hover:bg-[#f3f4f6]"
          >
            <Bell className="size-5 text-[#111827]" />
          </button>
          <button
            type="button"
            aria-label="Profil"
            className="flex items-center gap-3 rounded-md p-1 hover:bg-[#f3f4f6]"
          >
            <span className="sr-only">Użytkownik</span>
            <span className="inline-flex size-8 items-center justify-center rounded-full bg-[#e5e7eb] text-[#111827]">
              <User className="size-4" />
            </span>
            <span className="hidden text-sm font-medium text-[#111827] sm:inline">Młody Jan</span>
          </button>
        </div>
      </header>

      <main className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr_320px]">
        {/* Lewa kolumna - nawigacja kursu */}
        <section className="space-y-4">
          <div className="rounded-xl border border-[#e5e7eb] bg-white p-5">
            <h2 className="text-2xl font-bold leading-tight text-[#0f172a]">{courseTitle}</h2>
            <div className="mt-2 flex items-center gap-2 text-sm text-[#0f172a]">
              <GraduationCap className="size-4 text-primary" />
              <span className="font-medium">Relacyjne bazy danych dla Początkujących</span>
            </div>

            <div className="mt-5 space-y-2">
              {mockModules.map((module) => {
                const isDefaultOpen = module.title === 'Moduł: Relacje i klucze obce'
                return (
                  <details
                    key={module.id}
                    open={isDefaultOpen}
                    className="group rounded-lg border border-[#e5e7eb] bg-[#fafafa] px-3 py-2"
                  >
                    <summary className="cursor-pointer list-none text-sm font-semibold text-[#0f172a]">
                      <span className="flex items-center justify-between gap-3">
                        <span>{module.title}</span>
                        <span className="text-muted-foreground transition group-open:rotate-180">▾</span>
                      </span>
                    </summary>

                    <div className="mt-3 space-y-2 pb-1">
                      <ol className="space-y-1">
                        {module.lessons.map((lesson) => {
                          const isActive = lesson.status === 'active'
                          const isCompleted = lesson.status === 'completed'
                          const isLocked = lesson.status === 'locked'

                          return (
                            <li key={lesson.number}>
                              <div
                                className={[
                                  'flex items-center gap-3 rounded-md px-2 py-2',
                                  isActive ? 'bg-[#e5e7eb]' : 'bg-transparent',
                                ].join(' ')}
                              >
                                <span
                                  className={[
                                    'inline-flex size-6 items-center justify-center rounded-full',
                                    isActive || isCompleted ? 'bg-primary text-white' : 'bg-[#e5e7eb] text-[#6b7280]',
                                  ].join(' ')}
                                >
                                  {isCompleted ? <Check className="size-3.5" /> : null}
                                  {isActive ? <Play className="size-3.5" /> : null}
                                  {isLocked ? <Lock className="size-3.5" /> : null}
                                </span>

                                <div className="flex min-w-0 flex-1 items-center gap-2">
                                  <span className="text-xs font-semibold text-[#6b7280]">{lesson.number}</span>
                                  <span
                                    className={[
                                      'truncate text-sm',
                                      isActive ? 'font-semibold text-[#0f172a]' : 'text-[#0f172a]',
                                    ].join(' ')}
                                  >
                                    {lesson.title}
                                  </span>
                                </div>
                              </div>
                            </li>
                          )
                        })}
                      </ol>
                    </div>
                  </details>
                )
              })}
            </div>

            <div className="mt-5">
              <p className="text-sm text-[#4b5563]">Postęp kursu: {completedPercent}% completed</p>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#e5e7eb]">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${completedPercent}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Środkowa kolumna - odtwarzacz i notatki */}
        <section className="space-y-4">
          <div className="rounded-xl border border-[#e5e7eb] bg-white p-5">
            <CourseYouTubePlayer youtubeId="Pa1Wd29s85c" ariaLabel={videoTitle} />

            {/* Nawigacja lekcji */}
            <div className="mt-4 grid grid-cols-2 gap-4">
              <button
                type="button"
                className="justify-self-start text-left text-sm font-medium text-[#0f172a] hover:text-primary"
              >
                <span className="text-primary">←</span> Poprzednia lekcja
              </button>
              <button
                type="button"
                className="justify-self-end text-right text-sm font-medium text-[#0f172a] hover:text-primary"
              >
                Następna lekcja <span className="text-primary">→</span>
              </button>
            </div>
          </div>

          {/* Notatki */}
          <div className="rounded-xl border border-[#e5e7eb] bg-white p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#0f172a]">Notatki</h3>
            </div>

            {/* Pasek narzędzi edytora (mock) */}
            <div className="mt-3 flex flex-wrap gap-2 rounded-lg border border-[#e5e7eb] bg-[#f8fafc] p-2">
              <button type="button" className="inline-flex items-center justify-center rounded-md bg-white px-2 py-1 text-sm font-semibold hover:bg-[#f3f4f6]">
                B
              </button>
              <button type="button" className="inline-flex items-center justify-center rounded-md bg-white px-2 py-1 text-sm italic hover:bg-[#f3f4f6]">
                I
              </button>
              <button type="button" className="inline-flex items-center justify-center rounded-md bg-white px-2 py-1 text-sm font-semibold underline hover:bg-[#f3f4f6]">
                U
              </button>
              <button type="button" className="inline-flex items-center justify-center rounded-md bg-white px-2 py-1 text-sm font-semibold hover:bg-[#f3f4f6]">
                <span className="inline-block text-[#0f172a] line-through">abc</span>
              </button>

              <span className="mx-1 h-6 w-px bg-[#e5e7eb]" />

              <button type="button" className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-2 py-1 text-xs font-medium hover:bg-[#f3f4f6]">
                <span className="inline-flex size-3 rounded-full bg-[#16a34a]" />
                Tekst
              </button>

              <button type="button" className="inline-flex items-center justify-center rounded-md bg-white px-2 py-1 text-sm hover:bg-[#f3f4f6]">
                <span className="text-base leading-none text-[#0f172a]">• • •</span>
              </button>
              <button type="button" className="inline-flex items-center justify-center rounded-md bg-white px-2 py-1 text-sm hover:bg-[#f3f4f6]">
                <span className="text-base leading-none text-[#0f172a]">1. 2. 3.</span>
              </button>

              <button type="button" className="inline-flex items-center justify-center rounded-md bg-white px-2 py-1 text-sm hover:bg-[#f3f4f6]">
                IMG
              </button>

              <span className="mx-1 h-6 w-px bg-[#e5e7eb]" />

              <button type="button" className="inline-flex items-center justify-center rounded-md bg-white px-2 py-1 text-sm hover:bg-[#f3f4f6]">
                Undo
              </button>
              <button type="button" className="inline-flex items-center justify-center rounded-md bg-white px-2 py-1 text-sm hover:bg-[#f3f4f6]">
                Redo
              </button>
            </div>

            <Textarea
              className="mt-3 min-h-[220px] resize-y"
              defaultValue="To jest notatka do lekcji o relacjach w bazach danych"
            />
          </div>
        </section>

        {/* Prawa kolumna - dodatki */}
        <section className="space-y-4">
          <div className="rounded-xl border border-[#e5e7eb] bg-white p-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex size-9 items-center justify-center rounded-md bg-[#f3f4f6]">
                <Search className="size-4 text-[#111827]" />
              </span>
              <div className="flex-1">
                <Input placeholder="Szukaj notatek..." className="h-9" />
              </div>
            </div>

            <Button className="mt-4 w-full bg-primary hover:bg-primary/90" size="lg">
              Przeglądaj notatki
            </Button>

            <div className="mt-6 space-y-3">
              <h4 className="text-sm font-bold text-[#0f172a]">Moje notatki</h4>

              <div className="space-y-2">
                {[
                  {
                    date: '28.01.2024',
                    time: '10:15',
                    title: 'Klucze podstawowe (PK)',
                    snippet: 'Jak projektować PK i na co zwracać uwagę przy ich doborze...',
                  },
                  {
                    date: '30.01.2024',
                    time: '18:40',
                    title: 'Relacje jeden-do-wielu (FK)',
                    snippet: 'Kiedy FK ma sens, jak zapewnić spójność i uniknąć anomalii...',
                  },
                  {
                    date: '02.02.2024',
                    time: '09:05',
                    title: 'Ograniczenia i spójność',
                    snippet: 'Ograniczenia integralności jako praktyczny mechanizm jakości danych...',
                  },
                  {
                    date: '05.02.2024',
                    time: '21:22',
                    title: 'JOINy w praktyce',
                    snippet: 'Jak dobrać typ JOIN i jak czytać wynik zapytania...',
                  },
                ].map((n, idx) => (
                  <article key={idx} className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-[#6b7280]">
                        {n.date} {n.time}
                      </p>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-[#0f172a]">{n.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-[#4b5563]">{n.snippet}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="mt-7 space-y-3">
              <h4 className="text-sm font-bold text-[#0f172a]">Pytania i Odpowiedzi</h4>

              <div className="space-y-2">
                {[
                    'Question: sa notatka do lekcji o relacjach (FK)?',
                    'Co to jest JOIN i kiedy używać?',
                    'Jak zapewnić integralnosc danych przy FK?',
                ].map((q, idx) => (
                  <div key={idx} className="rounded-lg bg-[#f3f4f6] p-3 text-sm text-[#374151]">
                    {q}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8">
              <Button
                type="button"
                disabled
                className="w-full bg-[#e5e7eb] text-[#6b7280] hover:bg-[#e5e7eb]"
                aria-disabled="true"
              >
                <Lock className="mr-2 size-4" />
                Pobierz certyfikat
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
