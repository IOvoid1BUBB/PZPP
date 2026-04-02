import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import InboxContainer from "@/components/crm/inbox/InboxContainer";

export default async function StudentSkrzynkaPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!email) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
        Zaloguj się, aby zobaczyć skrzynkę wiadomości.
      </div>
    );
  }

  const lead = await prisma.lead.findUnique({
    where: { email },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Skrzynka</h1>
        <p className="text-sm text-muted-foreground">
          Twoja korespondencja z zespołem (powiązana z kontem leada).
        </p>
      </div>
      <InboxContainer leads={lead ? [lead] : []} isStudentView={true} />
    </div>
  );
}
