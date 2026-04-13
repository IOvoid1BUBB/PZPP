import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import InboxContainer from "@/components/crm/inbox/InboxContainer";
import { notFound } from "next/navigation";

export default async function StudentSkrzynkaPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!email) {
    notFound();
  }

  const lead = await prisma.lead.findUnique({
    where: { email },
  });

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4 pb-4">
      <div className="shrink-0 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Skrzynka</h1>
        <p className="text-sm text-muted-foreground">
          Twoja korespondencja z zespołem (powiązana z kontem leada).
        </p>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        <InboxContainer leads={lead ? [lead] : []} isStudentView={true} />
      </div>
    </section>
  );
}
