require("dotenv/config");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const bcrypt = require("bcryptjs");

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
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
        create: [
          { title: "Masterclass Sprzedaży", description: "Jak domykać deale." },
        ],
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
