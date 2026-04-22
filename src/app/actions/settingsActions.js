"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";

async function getCurrentUserOrError() {
  const auth = await requireUser();
  const userId = auth.userId;

  if (!auth.ok || !userId) {
    return { error: { success: false, message: auth.error || "Brak autoryzacji. Zaloguj się ponownie." } };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, password: true, timezone: true },
  });

  if (!user) {
    return { error: { success: false, message: "Nie znaleziono użytkownika." } };
  }

  return { user };
}

export async function getSettingsData() {
  try {
    const result = await getCurrentUserOrError();
    if (result.error) return result.error;

    const fullName = (result.user.name || "").trim();
    const [firstName = "", ...rest] = fullName.split(/\s+/).filter(Boolean);
    const lastName = rest.join(" ");

    return {
      success: true,
      data: {
        firstName,
        lastName,
        timezone: result.user.timezone || "Europe/Warsaw",
      },
    };
  } catch (error) {
    console.error("getSettingsData:", error);
    return { success: false, message: "Wystąpił błąd podczas pobierania ustawień." };
  }
}

export async function updateProfile(data) {
  try {
    const result = await getCurrentUserOrError();
    if (result.error) return result.error;

    const firstName = typeof data?.firstName === "string" ? data.firstName.trim() : "";
    const lastName = typeof data?.lastName === "string" ? data.lastName.trim() : "";

    if (!firstName) {
      return { success: false, message: "Imię jest wymagane." };
    }

    const fullName = [firstName, lastName].filter(Boolean).join(" ");

    await prisma.user.update({
      where: { id: result.user.id },
      data: { name: fullName },
    });

    revalidatePath("/dashboard/ustawienia");
    return { success: true, message: "Profil został zaktualizowany." };
  } catch (error) {
    console.error("updateProfile:", error);
    return { success: false, message: "Nie udało się zaktualizować profilu." };
  }
}

export async function updateTimezone(timezone) {
  try {
    const result = await getCurrentUserOrError();
    if (result.error) return result.error;

    const normalizedTimezone =
      typeof timezone === "string" ? timezone.trim() : "";

    if (!normalizedTimezone) {
      return { success: false, message: "Strefa czasowa jest wymagana." };
    }

    await prisma.user.update({
      where: { id: result.user.id },
      data: { timezone: normalizedTimezone },
    });

    revalidatePath("/dashboard/ustawienia");
    return { success: true, message: "Strefa czasowa została zaktualizowana." };
  } catch (error) {
    console.error("updateTimezone:", error);
    return { success: false, message: "Nie udało się zaktualizować strefy czasowej." };
  }
}

export async function changePassword(data) {
  try {
    const result = await getCurrentUserOrError();
    if (result.error) return result.error;

    const currentPassword =
      typeof data?.currentPassword === "string" ? data.currentPassword : "";
    const newPassword =
      typeof data?.newPassword === "string" ? data.newPassword : "";
    const confirmNewPassword =
      typeof data?.confirmNewPassword === "string" ? data.confirmNewPassword : "";

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return {
        success: false,
        message: "Uzupełnij aktualne hasło, nowe hasło i jego powtórzenie.",
      };
    }

    if (newPassword !== confirmNewPassword) {
      return {
        success: false,
        message: "Pole 'Powtórz nowe hasło' musi być równe polu 'Nowe hasło'.",
      };
    }

    if (!result.user.password) {
      return {
        success: false,
        message:
          "Dla tego konta nie można zmienić hasła tą metodą (brak hasła lokalnego).",
      };
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      result.user.password
    );

    if (!isCurrentPasswordValid) {
      return { success: false, message: "Aktualne hasło jest niepoprawne." };
    }

    if (currentPassword === newPassword) {
      return {
        success: false,
        message: "Nowe hasło musi różnić się od aktualnego hasła.",
      };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: result.user.id },
      data: { password: hashedPassword },
    });

    revalidatePath("/dashboard/ustawienia");
    return { success: true, message: "Hasło zostało zmienione." };
  } catch (error) {
    console.error("changePassword:", error);
    return { success: false, message: "Nie udało się zmienić hasła." };
  }
}
