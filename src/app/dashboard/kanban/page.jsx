import KanbanBoard from "@/components/features/kanbanboard/KanbanBoard";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { fetchJiraIssues } from "@/app/actions/externalApiActions";

/**
 * Strona widoku Kanban dla leadow.
 * @returns {JSX.Element}
 */
export default async function KanbanPage() {
  let jiraIssues = [];

  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (userId) {
      jiraIssues = await fetchJiraIssues(userId);
    }
  } catch (error) {
    console.error("KanbanPage.fetchJiraIssues:", error);
    jiraIssues = [];
  }

  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Tablica Kanban</h1>
        <p className="text-sm text-muted-foreground">
          Przeciągaj leady pomiedzy kolumnami Nowe, W trakcie uzgadniania i Sprzedane.
        </p>
      </header>
      <KanbanBoard jiraIssues={jiraIssues} />
    </section>
  );
}
