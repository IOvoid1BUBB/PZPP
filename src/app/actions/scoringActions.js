"use server";

import { prisma } from "@/lib/prisma";
import { SCORING_RULES, getLeadTemperature } from "@/lib/scoring";
import { revalidatePath } from "next/cache";
import { requireCreator, isAdminRole } from "@/lib/rbac";

/**
 * Dodaje (lub odejmuje) punkty za konkretną aktywność leada.
 * Opcjonalnie automatycznie zmienia status leada na "Zakwalifikowany".
 */
export async function addLeadActivity(leadId, activityType) {
  try {
    const auth = await requireCreator();
    if (!auth.ok) {
      return { success: false, error: auth.error };
    }

    // 1. Sprawdzamy, ile punktów jest warta ta akcja
    const points = SCORING_RULES[activityType];
    
    if (points === undefined) {
      throw new Error(`Nieznany typ aktywności: ${activityType}`);
    }

    // 2. Pobieramy obecny stan leada z bazy
    const currentLead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { score: true, status: true, ownerId: true }
    });

    if (!currentLead) {
      return { success: false, error: "Lead nie został znaleziony w bazie." };
    }

    if (!isAdminRole(auth.role) && currentLead.ownerId !== auth.userId) {
      return { success: false, error: "Brak dostępu do tego leada." };
    }

    // 3. Obliczamy nowy wynik (jeśli miał null, traktujemy jako 0)
    const currentScore = currentLead.score || 0;
    const newScore = currentScore + points;

    // 4. AUTOMATYZACJA: Jeśli lead uzbiera dużo punktów (temperatura HOT) 
    // i ma status "NEW" (Nowy), system sam awansuje go na "QUALIFIED" (Zakwalifikowany).
    let updatedStatus = currentLead.status;
    if (currentLead.status === "NEW" && getLeadTemperature(newScore) === "HOT") {
      updatedStatus = "QUALIFIED"; // Zakładam, że masz taki status w bazie
    }

    // 5. Aktualizacja w bazie danych
    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        score: newScore,
        status: updatedStatus,
      }
    });

    // 6. Odświeżenie widoku w aplikacji
    revalidatePath("/dashboard");
    // revalidatePath(`/dashboard/leads/${leadId}`); // Odkomentuj, jeśli masz widok szczegółów leada

    return { 
      success: true, 
      addedPoints: points,
      newScore: updatedLead.score,
      statusChangedTo: updatedStatus !== currentLead.status ? updatedStatus : null
    };

  } catch (error) {
    console.error("Błąd systemu scoringowego:", error);
    return { success: false, error: "Nie udało się zaktualizować punktacji leada." };
  }
}