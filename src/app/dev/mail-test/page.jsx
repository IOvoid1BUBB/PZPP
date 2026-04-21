import { prisma } from "@/lib/prisma";
import MailTestClient from "./ui";

export const dynamic = "force-dynamic";

export default async function MailTestPage() {
  const [recipients, leads] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: ["ADMIN", "KREATOR"] }, email: { not: null } },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.lead.findMany({
      select: { id: true, firstName: true, lastName: true, email: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  return <MailTestClient recipients={recipients} leads={leads} />;
}
