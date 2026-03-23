import KanbanBoard from "@/components/features/kanbanboard/KanbanBoard";

/**
 * Strona widoku Kanban dla leadow.
 * @returns {JSX.Element}
 */
export default function KanbanPage() {
  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Tablica Kanban</h1>
        <p className="text-sm text-muted-foreground">
          Przeciągaj leady pomiedzy kolumnami Nowe, W trakcie uzgadniania i Sprzedane.
        </p>
      </header>
      <KanbanBoard />
    </section>
  );
}
