import CalendarBoard from "@/components/features/calendar/CalendarBoard";

/**
 * Strona widoku kalendarza w panelu zarządzania.
 * @returns {JSX.Element}
 */
export default function CalendarPage() {
  return (
    <section className="flex h-[calc(100vh-8.5rem)] flex-col space-y-4 pb-4">
      <header>
        <h1 className="text-2xl font-semibold">Kalendarz</h1>
        <p className="text-sm text-muted-foreground">
          Planowanie spotkań oraz szybkie tworzenie wydarzeń po kliknięciu w
          kalendarzu.
        </p>
      </header>

      <div className="min-h-0 flex-1">
        <CalendarBoard />
      </div>
    </section>
  );
}

