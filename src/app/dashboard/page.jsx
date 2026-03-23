/**
 * Strona glowna dashboardu CRM.
 * @returns {JSX.Element}
 */
export default function DashboardPage() {
  return (
    <section className="space-y-2">
      <h1 className="text-2xl font-semibold">Dashboard CRM</h1>
      <p className="text-muted-foreground">
        Przejdz do widoku Kanban, aby zarzadzac statusem leadow.
      </p>
    </section>
  );
}
