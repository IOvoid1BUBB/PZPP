import { PrismaClient } from "@prisma/client";

//Inicjalizacja klienta prismy zapobiega tworzeniu wielu instancji przy przeładowaniu kodu

const globalForPrisma = global;

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ["query"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;