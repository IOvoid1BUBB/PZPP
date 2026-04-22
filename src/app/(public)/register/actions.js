"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

// 1. Definiujemy schemat walidacji uwzględniający rolę
const registerSchema = z.object({
  name: z.string().min(2, "Imię jest za krótkie"),
  email: z.string().email("Niepoprawny format email"),
  password: z.string().min(8, "Hasło musi mieć min. 8 znaków"),
  role: z.enum(["KREATOR", "UCZESTNIK"], {
    errorMap: () => ({ message: "Nieprawidłowa rola" }),
  }),
  inviteCode: z.string().optional(),
});

export async function registerUser(formData) {
  try {
    // Pobieramy i walidujemy dane
    const rawData = Object.fromEntries(formData.entries());
    const validated = registerSchema.safeParse(rawData);

    if (!validated.success) {
      const firstIssue = validated.error.issues?.[0];
      return { error: firstIssue?.message || "Niepoprawne dane formularza." };
    }

    // 2. Pobieramy zwalidowaną rolę (role) ze zmiennych
    const { email, password, name, role, inviteCode } = validated.data;

    if (role === "KREATOR") {
      if (inviteCode !== process.env.CREATOR_INVITE_CODE) {
        return { error: "Nieprawidłowy kod zaproszenia dla Kreatora." };
      }
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return { error: "Użytkownik już istnieje" };

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role:
          role === "KREATOR" &&
          formData.get("inviteCode") === process.env.CREATOR_INVITE_CODE
            ? "KREATOR"
            : "UCZESTNIK",
      },
    });

    return { success: true };
  } catch (e) {
    return { error: "Błąd serwera. Spróbuj ponownie później." };
  }
}
