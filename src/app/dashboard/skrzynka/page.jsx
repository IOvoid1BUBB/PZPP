import { getLeads } from "@/app/actions/leadActions";
import InboxContainer from "@/components/crm/inbox/InboxContainer";
import { Suspense } from "react";

export default async function SkrzynkaPage() {
  const leads = await getLeads();

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4 pb-4">
      <div className="shrink-0 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Skrzynka</h1>
        <p className="text-sm text-muted-foreground">
          Wszystkie wiadomości e-mail i SMS przypisane do leadów w jednym widoku.
        </p>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Wczytywanie skrzynki...</div>}>
          <InboxContainer leads={leads} isStudentView={false} />
        </Suspense>
      </div>
    </section>
  );
}
