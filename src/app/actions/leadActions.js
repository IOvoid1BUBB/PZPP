"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const ALLOWED_KANBAN_STATUSES = ["NEW", "CONTACTED", "WON"];

// Bezpieczna funkcja serwerowa do zapisu leada
export async function createLead(formData) {
  try {
    const firstName = formData.get("firstName");
    const lastName = formData.get("lastName");
    const email = formData.get("email");
    const phone = formData.get("phone");
    const source = formData.get("source") || "Formularz na Landing Page";

    // Podstawowa walidacja (bezpieczeństwo)
    if (!firstName || !email) {
      return { success: false, error: "Imię i e-mail są wymagane!" };
    }

    // Zapis do bazy PostgreSQL za pomocą Prisma
    const newLead = await prisma.lead.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        source,
        status: "NEW", // domyślny status z Prisma Schema
        score: 0,
      },
    });

    // Odświeżenie danych w cache, aby tabela CRM zaktualizowała się automatycznie
    revalidatePath("/crm"); 
    return { success: true, lead: newLead };
    
  } catch (error) {
    // Prisma zwraca błąd P2002 przy naruszeniu unikalności (np. powtórzony e-mail)
    if (error.code === 'P2002') {
      return { success: false, error: "Lead z tym adresem e-mail już istnieje w naszej bazie." };
    }
    console.error(error);
    return { success: false, error: "Wystąpił błąd serwera. Spróbuj ponownie." };
  }
}

// Pobieranie danych dla tabeli
export async function getLeads() {
  try {
    return await prisma.lead.findMany({
      orderBy: { createdAt: 'desc' },
    });
  } catch (error) {
    return [];
  }
}

/**
 * Aktualizuje status leada z walidacją wspieranych kolumn Kanban.
 * @param {string} leadId
 * @param {"NEW" | "CONTACTED" | "WON"} newStatus
 * @returns {Promise<{success: boolean, lead?: import("@prisma/client").Lead, error?: string}>}
 */
export async function updateLeadStatus(leadId, newStatus) {
  try {
    if (!leadId || typeof leadId !== "string") {
      return { success: false, error: "Nieprawidłowe ID leada." };
    }

    if (!ALLOWED_KANBAN_STATUSES.includes(newStatus)) {
      return { success: false, error: "Nieprawidłowy status Kanban." };
    }

    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: { status: newStatus },
    });

    revalidatePath("/dashboard/kanban");
    revalidatePath("/dashboard");

    return { success: true, lead: updatedLead };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Nie udało się zaktualizować statusu leada." };
  }
}