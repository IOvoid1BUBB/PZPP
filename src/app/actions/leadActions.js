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

// Statystyki dashboardu (łącznie leadów, konwersja, kursy, dokumenty)
export async function getDashboardStats() {
  try {
    const [totalLeads, wonLeads, activeCourses, pendingSignatures] =
      await Promise.all([
        prisma.lead.count(),
        prisma.lead.count({ where: { status: "WON" } }),
        prisma.course.count({ where: { isPublished: true } }),
        prisma.document.count({ where: { isSigned: false } }),
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
    // #region agent log
    fetch("http://127.0.0.1:7452/ingest/4fcb5328-7a6a-4979-9992-6357b51d1f78", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "aeb5d6",
      },
      body: JSON.stringify({
        sessionId: "aeb5d6",
        runId: "prisma-bugs-check",
        hypothesisId: "H3",
        location: "src/app/actions/leadActions.js:getLeads",
        message: "getLeads query start",
        data: { queryKey: "leads.findMany" },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    return await prisma.lead.findMany({
      orderBy: { createdAt: 'desc' },
    });
  } catch (error) {
    // #region agent log
    fetch("http://127.0.0.1:7452/ingest/4fcb5328-7a6a-4979-9992-6357b51d1f78", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "aeb5d6",
      },
      body: JSON.stringify({
        sessionId: "aeb5d6",
        runId: "prisma-bugs-check",
        hypothesisId: "H3",
        location: "src/app/actions/leadActions.js:getLeads:catch",
        message: "getLeads query failed",
        data: {
          errorName: error?.name || "unknown",
          errorCode: error?.code || "none",
          hasMeta: Boolean(error?.meta),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

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
    // #region agent log
    fetch("http://127.0.0.1:7452/ingest/4fcb5328-7a6a-4979-9992-6357b51d1f78", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "aeb5d6",
      },
      body: JSON.stringify({
        sessionId: "aeb5d6",
        runId: "prisma-bugs-check",
        hypothesisId: "H4",
        location: "src/app/actions/leadActions.js:updateLeadStatus",
        message: "updateLeadStatus start",
        data: {
          hasLeadId: Boolean(leadId),
          newStatus,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

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
    // #region agent log
    fetch("http://127.0.0.1:7452/ingest/4fcb5328-7a6a-4979-9992-6357b51d1f78", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "aeb5d6",
      },
      body: JSON.stringify({
        sessionId: "aeb5d6",
        runId: "prisma-bugs-check",
        hypothesisId: "H4",
        location: "src/app/actions/leadActions.js:updateLeadStatus:catch",
        message: "updateLeadStatus failed",
        data: {
          errorName: error?.name || "unknown",
          errorCode: error?.code || "none",
          hasMeta: Boolean(error?.meta),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    console.error(error);
    return { success: false, error: "Nie udało się zaktualizować statusu leada." };
  }
}