"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireCreatorOrAdmin, isAdminRole } from "@/lib/rbac";

const ALLOWED_KANBAN_STATUSES = ["NEW", "CONTACTED", "WON"];

// Bezpieczna funkcja serwerowa do zapisu leada
export async function createLead(formData) {
  try {
    const auth = await requireCreatorOrAdmin();
    if (!auth.ok) return { success: false, error: auth.error };

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
        email: String(email).toLowerCase(),
        phone,
        source,
        status: "NEW", // domyślny status z Prisma Schema
        score: 0,
        ownerId: auth.userId,
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

// Statystyki dashboardu (łącznie leadów, konwersja, kursy, dokumenty)
export async function getDashboardStats() {
  try {
    const auth = await requireCreatorOrAdmin();
    if (!auth.ok) {
      return {
        totalLeads: 0,
        conversionRate: "0%",
        activeCourses: 0,
        pendingSignatures: 0,
      };
    }

    const leadWhere = isAdminRole(auth.role) ? {} : { ownerId: auth.userId };
    const [totalLeads, wonLeads, activeCourses, pendingSignatures] =
      await Promise.all([
        prisma.lead.count({ where: leadWhere }),
        prisma.lead.count({
          where: isAdminRole(auth.role) ? { status: "WON" } : { ...leadWhere, status: "WON" },
        }),
        prisma.course.count({
          where: isAdminRole(auth.role)
            ? { isPublished: true }
            : { isPublished: true, authorId: auth.userId },
        }),
        prisma.document.count({
          where: isAdminRole(auth.role)
            ? { isSigned: false }
            : { isSigned: false, lead: { ownerId: auth.userId } },
        }),
      ]);

    const conversionRate =
      totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : "0";

    return {
      totalLeads,
      conversionRate: `${conversionRate}%`,
      activeCourses,
      pendingSignatures,
    };
  } catch (error) {
    console.error("getDashboardStats:", error);
    return {
      totalLeads: 0,
      conversionRate: "0%",
      activeCourses: 0,
      pendingSignatures: 0,
    };
  }
}

// Pobieranie danych dla tabeli
export async function getLeads() {
  try {
    const auth = await requireCreatorOrAdmin();
    if (!auth.ok) return [];

    return await prisma.lead.findMany({
      where: isAdminRole(auth.role) ? {} : { ownerId: auth.userId },
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
    const auth = await requireCreatorOrAdmin();
    if (!auth.ok) return { success: false, error: auth.error };

    if (!leadId || typeof leadId !== "string") {
      return { success: false, error: "Nieprawidłowe ID leada." };
    }

    if (!ALLOWED_KANBAN_STATUSES.includes(newStatus)) {
      return { success: false, error: "Nieprawidłowy status Kanban." };
    }

    if (!isAdminRole(auth.role)) {
      const updated = await prisma.lead.updateMany({
        where: { id: leadId, ownerId: auth.userId },
        data: { status: newStatus },
      });
      if (updated.count === 0) {
        return { success: false, error: "Lead nie istnieje lub nie masz do niego dostępu." };
      }
    } else {
      await prisma.lead.update({
        where: { id: leadId },
        data: { status: newStatus },
      });
    }

    const updatedLead = await prisma.lead.findUnique({ where: { id: leadId } });

    revalidatePath("/dashboard/kanban");
    revalidatePath("/dashboard");

    return { success: true, lead: updatedLead };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Nie udało się zaktualizować statusu leada." };
  }
}

/**
 * Usuwa leada wraz z danymi powiązanymi (cascade w DB).
 * KREATOR może usuwać tylko swoje leady, ADMIN dowolne.
 * @param {string} leadId
 */
export async function deleteLead(leadId) {
  try {
    const auth = await requireCreatorOrAdmin();
    if (!auth.ok) return { success: false, error: auth.error };

    if (!leadId || typeof leadId !== "string") {
      return { success: false, error: "Nieprawidłowe ID leada." };
    }

    const result = isAdminRole(auth.role)
      ? await prisma.lead.deleteMany({ where: { id: leadId } })
      : await prisma.lead.deleteMany({ where: { id: leadId, ownerId: auth.userId } });

    if (!result?.count) {
      return { success: false, error: "Lead nie istnieje lub nie masz do niego dostępu." };
    }

    revalidatePath("/crm");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/skrzynka");
    revalidatePath("/dashboard/kanban");
    return { success: true };
  } catch (error) {
    console.error("deleteLead:", error);
    return { success: false, error: "Nie udało się usunąć leada." };
  }
}

export async function createOrUpdateLead(data) {
  const auth = await requireCreatorOrAdmin();
  if (!auth.ok) throw new Error(auth.error || "Unauthorized");

  const { email, firstName, lastName, ...otherData } = data;
  const normalizedEmail = String(email || "").toLowerCase();

  // 1. Szukamy istniejącego leada po mailu
  const existingLead = await prisma.lead.findFirst({
    where: isAdminRole(auth.role)
      ? { email: normalizedEmail }
      : { ownerId: auth.userId, email: normalizedEmail },
    select: { id: true, ownerId: true },
  });

  if (existingLead) {
    if (!isAdminRole(auth.role) && existingLead.ownerId !== auth.userId) {
      throw new Error("Brak uprawnień do aktualizacji tego leada.");
    }
    // 2. Jeśli istnieje, aktualizujemy go i podbijamy punkty (np. za powtórny kontakt)
    return await prisma.lead.update({
      where: { id: existingLead.id },
      data: {
        ...otherData,
        score: { increment: 10 } // Bonus za powracający kontakt
      }
    });
  }

  // 3. Jeśli nie istnieje, tworzymy nowy rekord z bazowym scoringiem
  return await prisma.lead.create({
    data: {
      email: normalizedEmail,
      firstName,
      lastName,
      score: 20, // Punkty startowe za zapis
      ownerId: auth.userId,
      ...otherData
    }
  });
}