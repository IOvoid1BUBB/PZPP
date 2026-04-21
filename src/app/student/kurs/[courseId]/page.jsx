import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requireStudentOrAdmin, isAdminRole } from '@/lib/rbac'
import {
  Bell,
  BookMarked,
  Check,
  GraduationCap,
  Lock,
  Play,
  PlayCircle,
  FileText,
  Link2,
  Search,
  User,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import CourseYouTubePlayer from '@/components/course/CourseYouTubePlayer'
import NextLessonButton from '@/components/features/courses/NextLessonButton'
import StudentLessonNotesEditor from '@/components/features/courses/StudentLessonNotesEditor'
import LessonQuestionsQuiz from '@/components/course/LessonQuestionsQuiz'
import DbErrorToast from '@/components/student/DbErrorToast'
import { Progress } from '@/components/ui/progress'

const COURSE_LOAD_ERROR =
  'Nie udalo sie wczytac kursu. Sprawdz polaczenie z baza lub sprobuj ponownie pozniej.'

function getNormalizedId(courseIdParam) {
  return Array.isArray(courseIdParam) ? courseIdParam[0] : courseIdParam
}

function getYoutubeIdFromUrl(url) {
  if (!url || typeof url !== 'string') return null
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtu.be')) {
      const id = u.pathname.replace('/', '').trim()
      return id || null
    }
    if (u.hostname.includes('youtube.com')) {
      const id = u.searchParams.get('v')
      return id || null
    }
  } catch {
    // ignore
  }
  return null
}

export default async function StudentCoursePage({ params, searchParams }) {
  const { courseId } = await params
  const normalizedCourseId = getNormalizedId(courseId)
  const resolvedSearchParams = (await Promise.resolve(searchParams)) || {}
  const auth = await requireStudentOrAdmin()
  if (!auth.ok) notFound()

  let course
  let enrollment = null
  try {
    course = await prisma.course.findUnique({
      where: { id: normalizedCourseId },
      include: {
        modules: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              include: {
                resources: { orderBy: { order: 'asc' } },
                questions: { orderBy: { order: 'asc' } },
              },
            },
          },
        },
      },
    })

    if (!isAdminRole(auth.role)) {
      enrollment = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: auth.userId, courseId: normalizedCourseId } },
        select: { id: true, progress: true },
      })
    }
  } catch (err) {
    console.error('[StudentCoursePage]', err)
    return (
      <div className="space-y-4">
        <DbErrorToast message={COURSE_LOAD_ERROR} />
        <p className="text-sm text-muted-foreground">{COURSE_LOAD_ERROR}</p>
      </div>
    )
  }

  if (!course) notFound()
  if (!course.isPublished && !isAdminRole(auth.role)) notFound()
  if (!isAdminRole(auth.role) && !enrollment) notFound()

  const courseTitle = course.title || 'Kurs'
  const modules = course.modules ?? []

  const lessonIdParam = resolvedSearchParams?.lessonId
  const normalizedLessonId = Array.isArray(lessonIdParam) ? lessonIdParam[0] : lessonIdParam

  const firstModule = modules[0]
  const firstLesson = firstModule?.lessons?.[0]

  const activeLesson =
    (normalizedLessonId
      ? modules.flatMap((m) => m.lessons ?? []).find((l) => l.id === normalizedLessonId)
      : null) || firstLesson

  const activeModule =
    activeLesson?.moduleId
      ? modules.find((m) => m.id === activeLesson.moduleId) || firstModule
      : firstModule

  if (!activeLesson || !activeModule) notFound()

  const videoTitle = `${activeModule.title}: ${activeLesson.title}`
  const youtubeId = getYoutubeIdFromUrl(activeLesson.videoUrl)
  const completedPercent = Math.min(100, Math.max(0, enrollment?.progress ?? 0))
  const activeLessonQuestions = activeLesson.questions ?? []
  const displayUserName =
    (typeof auth.session?.user?.name === 'string' && auth.session.user.name.trim()) ||
    (typeof auth.session?.user?.email === 'string' && auth.session.user.email.trim()) ||
    'Uzytkownik'

  let studentNote = ''
  try {
    const note = await prisma.studentLessonNote.findUnique({
      where: {
        userId_lessonId: {
          userId: auth.userId,
          lessonId: activeLesson.id,
        },
      },
      select: { content: true },
    })
    studentNote = note?.content ?? ''
  } catch (err) {
    console.error('[StudentCoursePage:studentNote]', err)
  }

  let recentStudentNotes = []
  try {
    recentStudentNotes = await prisma.studentLessonNote.findMany({
      where: {
        userId: auth.userId,
        lesson: { module: { courseId: normalizedCourseId } },
      },
      include: {
        lesson: { select: { id: true, title: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 8,
    })
  } catch (err) {
    console.error('[StudentCoursePage:recentStudentNotes]', err)
  }

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
            <span className="hidden text-sm font-medium text-[#111827] sm:inline">{displayUserName}</span>
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
              <span className="font-medium">Portal studenta</span>
            </div>

            <div className="mt-5 space-y-2">
              {modules.map((module) => {
                const isDefaultOpen = module.id === activeModule?.id
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
                        {(module.lessons ?? []).map((lesson) => {
                          const isActive = lesson.id === activeLesson?.id
                          const isCompleted = false
                          const isLocked = false

                          return (
                            <li key={lesson.id}>
                              <Link
                                href={`/student/kurs/${normalizedCourseId}?lessonId=${lesson.id}`}
                                className={[
                                  'flex items-center gap-3 rounded-md px-2 py-2 transition-colors',
                                  isActive ? 'bg-[#e5e7eb]' : 'bg-transparent hover:bg-[#f3f4f6]',
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
                                  <span className="text-xs font-semibold text-[#6b7280]">
                                    {lesson.order}
                                  </span>
                                  <span
                                    className={[
                                      'truncate text-sm',
                                      isActive ? 'font-semibold text-[#0f172a]' : 'text-[#0f172a]',
                                    ].join(' ')}
                                  >
                                    {lesson.title}
                                  </span>
                                </div>
                              </Link>
                            </li>
                          )
                        })}
                      </ol>
                    </div>
                  </details>
                )
              })}
            </div>

            <div className="mt-5 space-y-2">
              <p className="text-sm text-[#4b5563]">Postep kursu: {completedPercent}%</p>
              <Progress value={completedPercent} className="h-2" />
            </div>
          </div>
        </section>

        {/* Środkowa kolumna - odtwarzacz i notatki */}
        <section className="space-y-4">
          <div className="rounded-xl border border-[#e5e7eb] bg-white p-5">
            <h2 className="text-lg font-semibold text-[#0f172a]">{videoTitle}</h2>
            {(activeLesson.content || '').trim() ? (
              <div className="mt-3 rounded-lg border border-[#e5e7eb] bg-[#fafafa] p-4">
                <div
                  className="prose prose-sm max-w-none text-[#0f172a]"
                   
                  dangerouslySetInnerHTML={{ __html: activeLesson.content }}
                />
              </div>
            ) : null}

            {youtubeId ? (
              <div className="mt-4">
                <CourseYouTubePlayer youtubeId={youtubeId} ariaLabel={videoTitle} />
              </div>
            ) : activeLesson.videoUrl ? (
              <div className="rounded-lg border border-[#e5e7eb] bg-[#fafafa] p-4 text-sm">
                <div className="font-semibold text-[#0f172a]">Wideo</div>
                <div className="mt-2 break-all text-[#4b5563]">{activeLesson.videoUrl}</div>
                <div className="mt-3">
                  <Button asChild variant="outline">
                    <a href={activeLesson.videoUrl} target="_blank" rel="noreferrer">
                      Otwórz w nowej karcie
                    </a>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-[#e5e7eb] bg-[#fafafa] p-4 text-sm text-[#4b5563]">
                Brak wideo w tej lekcji.
              </div>
            )}

            {/* Nawigacja lekcji */}
            <div className="mt-4 grid grid-cols-2 gap-4">
              <button
                type="button"
                className="justify-self-start text-left text-sm font-medium text-[#0f172a] hover:text-primary"
              >
                <span className="text-primary">←</span> Poprzednia lekcja
              </button>
              <div className="justify-self-end text-right text-sm font-medium text-[#0f172a] hover:text-primary">
                <NextLessonButton courseId={normalizedCourseId} lessonId={activeLesson.id} />
              </div>
            </div>
          </div>

          <LessonQuestionsQuiz questions={activeLessonQuestions} />

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

            <StudentLessonNotesEditor lessonId={activeLesson.id} initialValue={studentNote} />
          </div>

          {(activeLesson.videoText || (activeLesson.resources ?? []).length > 0) ? (
            <div className="rounded-xl border border-[#e5e7eb] bg-white p-5">
              <h3 className="text-lg font-bold text-[#0f172a]">Materiały do lekcji</h3>

              {activeLesson.videoText ? (
                <div className="mt-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#0f172a]">
                    <FileText className="size-4 text-primary" />
                    Tekst do wideo
                  </div>
                  <div className="mt-2 whitespace-pre-wrap rounded-lg border border-[#e5e7eb] bg-[#fafafa] p-3 text-sm text-[#0f172a]">
                    {activeLesson.videoText}
                  </div>
                </div>
              ) : null}

              {(activeLesson.resources ?? []).length > 0 ? (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#0f172a]">
                    <Link2 className="size-4 text-primary" />
                    Linki i pliki PDF
                  </div>
                  <ul className="space-y-2">
                    {(activeLesson.resources ?? []).map((r) => (
                      <li key={r.id} className="rounded-lg border border-[#e5e7eb] bg-[#fafafa] p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-[#0f172a]">
                              {r.title}
                            </div>
                            <div className="mt-1 break-all text-xs text-[#4b5563]">{r.url}</div>
                          </div>
                          <Button asChild size="sm" variant="outline">
                            <a href={r.url} target="_blank" rel="noreferrer">
                              Otwórz
                            </a>
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
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
                {recentStudentNotes.length > 0 ? (
                  recentStudentNotes.map((n) => (
                    <article key={n.id} className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-[#6b7280]">
                          {new Date(n.updatedAt).toLocaleString('pl-PL')}
                        </p>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-[#0f172a]">{n.lesson.title}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-[#4b5563]">{n.content}</p>
                      <div className="mt-2">
                        <Link
                          href={`/student/kurs/${normalizedCourseId}?lessonId=${n.lesson.id}`}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          Otwórz lekcję
                        </Link>
                      </div>
                    </article>
                  ))
                ) : (
                  <article className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-[#6b7280]">Brak zapisanych notatek</p>
                    </div>
                    <p className="mt-1 text-xs text-[#4b5563]">
                      Twoje notatki beda zapisywane per lekcja i widoczne tylko dla Ciebie.
                    </p>
                  </article>
                )}
              </div>
            </div>

            <div className="mt-7 space-y-3">
              <h4 className="text-sm font-bold text-[#0f172a]">Pytania i Odpowiedzi</h4>

              <div className="space-y-2">
                {activeLessonQuestions.length > 0 ? (
                  activeLessonQuestions.map((qa) => (
                    <article key={qa.id} className="rounded-lg bg-[#f3f4f6] p-3 text-sm text-[#374151]">
                      <p className="font-semibold text-[#0f172a]">{qa.question}</p>
                      <p className="mt-1 text-xs text-[#4b5563]">
                        {qa.answer?.trim()
                          ? qa.answer
                          : 'Odpowiedź nie została jeszcze dodana przez kreatora.'}
                      </p>
                    </article>
                  ))
                ) : (
                  <div className="rounded-lg bg-[#f3f4f6] p-3 text-sm text-[#4b5563]">
                    Brak pytań dla tej lekcji. Kreator może dodać je w edycji lekcji.
                  </div>
                )}
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
