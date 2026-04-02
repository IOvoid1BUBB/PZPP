import { getLeads } from "@/app/actions/leadActions";
import InboxContainer from "@/components/crm/inbox/InboxContainer";

export default async function SkrzynkaPage() {
  const leads = await getLeads();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Skrzynka</h1>
        <p className="text-sm text-muted-foreground">
          Wszystkie wiadomości e-mail i SMS przypisane do leadów w jednym widoku.
        </p>
      </div>
      <InboxContainer leads={leads} isStudentView={false} />
    </div>
  );
}
