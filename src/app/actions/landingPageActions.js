"use server";

import { prisma } from "src/lib/prisma";
import { revalidatePath } from "next/cache";

export async function saveLandingPage(data) {
  try {
    const { title, slug, htmlData, cssData } = data;

    // Zapisujemy nową stronę (lub aktualizujemy istniejącą, jeśli wolelibyście taką logikę)
    const newPage = await prisma.landingPage.create({
      data: {
        title: title || "Nowa Kampania",
        slug: slug || `kampania-${Date.now()}`, // unikalny slug do paska adresu
        htmlData,
        cssData,
        isActive: true,
      },
    });

    revalidatePath("/builder");
    return { success: true, page: newPage };
  } catch (error) {
    console.error("Błąd zapisu strony:", error);
    return { success: false, error: "Nie udało się zapisać Landing Page'a." };
  }
}