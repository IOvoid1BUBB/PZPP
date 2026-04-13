import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import InboxContainer from "@/components/crm/inbox/InboxContainer";
import { notFound } from "next/navigation";

export default async function StudentSkrzynkaPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  const userId = session?.user?.id;

  if (!email || !userId) {
    notFound();
  }

  const enrollment = await prisma.enrollment.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { course: { select: { authorId: true } } },
  });

  const ownerId = enrollment?.course?.authorId ?? null;
  const lead = ownerId
    ? await prisma.lead.findFirst({
        where: { ownerId, email: String(email).toLowerCase() },
      })
    : null;

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
