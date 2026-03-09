"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

// Definiujemy schemat walidacji
const registerSchema = z.object({
  name: z.string().min(2, "Imię jest za krótkie"),
  email: z.string().email("Niepoprawny format email"),
  password: z.string().min(8, "Hasło musi mieć min. 8 znaków"),
});

export async function registerUser(formData) {
  // Pobieramy i walidujemy dane
  const rawData = Object.fromEntries(formData.entries());
  const validated = registerSchema.safeParse(rawData);

  if (!validated.success) {
    return { error: validated.error.errors[0].message };
  }

  const { email, password, name } = validated.data;

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return { error: "Użytkownik już istnieje" };

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: "UCZESTNIK", // Domyślna rola dla rejestrujących się
      },
    });

    return { success: true };
  } catch (e) {
    return { error: "Błąd serwera. Spróbuj ponownie później." };
  }
}
