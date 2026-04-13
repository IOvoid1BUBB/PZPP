import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const fallbackUser =
    (await prisma.user.findFirst({
      where: { role: "ADMIN" },
      select: { id: true, role: true, email: true },
      orderBy: { createdAt: "asc" },
    })) ||
    (await prisma.user.findFirst({
      where: { role: "KREATOR" },
      select: { id: true, role: true, email: true },
      orderBy: { createdAt: "asc" },
    })) ||
    (await prisma.user.findFirst({
      select: { id: true, role: true, email: true },
      orderBy: { createdAt: "asc" },
    }));

  if (!fallbackUser?.id) {
    throw new Error("Brak użytkowników w bazie. Nie mam do kogo przypisać danych.");
  }

  const [courses, leads] = await Promise.all([
    prisma.course.updateMany({
      where: { authorId: null },
      data: { authorId: fallbackUser.id },
    }),
    prisma.lead.updateMany({
      where: { ownerId: null },
      data: { ownerId: fallbackUser.id },
    }),
  ]);

  console.log("Ownership backfill complete:");
  console.log("- fallback user:", fallbackUser);
  console.log("- courses updated:", courses.count);
  console.log("- leads updated:", leads.count);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

