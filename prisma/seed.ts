import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "./generated/prisma/client";

function withSchema(urlString: string | undefined, schema: string) {
  if (!urlString) return urlString;
  try {
    const u = new URL(urlString);
    u.searchParams.set("schema", schema);
    return u.toString();
  } catch {
    return urlString;
  }
}

const connectionString = withSchema(process.env.DIRECT_URL || process.env.DATABASE_URL, "public");
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const password = await bcrypt.hash("password123", 12);

  await prisma.user.upsert({
    where: { email: "kreator1@test.pl" },
    update: {
      name: "Igor Kreator",
      password,
      role: "KREATOR",
    },
    create: {
      email: "kreator1@test.pl",
      name: "Igor Kreator",
      password,
      role: "KREATOR",
      courses: {
        create: [
          {
            title: "Kurs React dla Początkujących",
            description: "Naucz się Next.js od zera.",
          },
        ],
      },
      ownedLeads: {
        create: [
          {
            firstName: "Jan",
            lastName: "Kowalski",
            email: "jan@wp.pl",
            status: "NEW",
          },
        ],
      },
    },
  });

  await prisma.user.upsert({
    where: { email: "kreator2@test.pl" },
    update: {
      name: "Marek Biznes",
      password,
      role: "KREATOR",
    },
    create: {
      email: "kreator2@test.pl",
      name: "Marek Biznes",
      password,
      role: "KREATOR",
      courses: {
        create: [{ title: "Masterclass Sprzedaży", description: "Jak domykać deale." }],
      },
    },
  });

  await prisma.user.upsert({
    where: { email: "student1@test.pl" },
    update: {
      name: "Adam Uczeń",
      password,
      role: "UCZESTNIK",
    },
    create: {
      email: "student1@test.pl",
      name: "Adam Uczeń",
      password,
      role: "UCZESTNIK",
    },
  });

  await prisma.user.upsert({
    where: { email: "student2@test.pl" },
    update: {
      name: "Ewa Kursantka",
      password,
      role: "UCZESTNIK",
    },
    create: {
      email: "student2@test.pl",
      name: "Ewa Kursantka",
      password,
      role: "UCZESTNIK",
    },
  });

  console.log("Seed zakończony sukcesem!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

