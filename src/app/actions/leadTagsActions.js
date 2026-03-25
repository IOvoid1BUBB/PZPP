"use server";

import { prisma } from "@/lib/prisma"; 
import { revalidatePath } from "next/cache";

// 1. Pobieranie wszystkich dostępnych tagów w systemie
export async function getAllTags() {
  try {
    return await prisma.tag.findMany({
      orderBy: { name: "asc" },
    });
  } catch (error) {
    console.error("Błąd pobierania tagów:", error);
    return [];
  }
}

// 2. Tworzenie zupełnie nowego tagu
export async function createTag(name, color = "#e2e8f0") {
  try {
    const newTag = await prisma.tag.create({
      data: { name, color },
    });
    revalidatePath("/crm"); // Odśwież widok CRM
    return { success: true, tag: newTag };
  } catch (error) {
    console.error("Błąd tworzenia tagu:", error);
    return { success: false, error: "Nie udało się stworzyć tagu." };
  }
}

// 3. Magia Prismy: Przypisanie tagu do Leada (relacja wiele-do-wielu)
export async function addTagToLead(leadId, tagId) {
  try {
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        tags: {
          connect: { id: tagId }, // To automatycznie tworzy wpis w ukrytej tabeli łączącej!
        },
      },
    });
    revalidatePath(`/crm/lead/${leadId}`);
    return { success: true };
  } catch (error) {
    console.error("Błąd przypisywania tagu:", error);
    return { success: false, error: "Błąd przypisywania tagu." };
  }
}

// 4. Odpinanie tagu od Leada
export async function removeTagFromLead(leadId, tagId) {
  try {
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        tags: {
          disconnect: { id: tagId }, // Usuwa powiązanie, ale sam Tag zostaje w systemie
        },
      },
    });
    revalidatePath(`/crm/lead/${leadId}`);
    return { success: true };
  } catch (error) {
    console.error("Błąd usuwania tagu:", error);
    return { success: false, error: "Błąd usuwania tagu." };
  }
}