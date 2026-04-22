"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireCreator, isAdminRole } from "@/lib/rbac";

const ALLOWED_DEAL_STAGES = [
  "DISCOVERY",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "LOST",
];

export async function createDeal(data) {
  try {
    const auth = await requireCreator();
    if (!auth.ok) return { success: false, error: auth.error };

    const { name, value, currency, probability, expectedCloseDate, stage, notes, leadId } = data;

    if (!name || !leadId) {
      return { success: false, error: "Nazwa deala i lead sa wymagane." };
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true, ownerId: true },
    });
    if (!lead) return { success: false, error: "Lead nie istnieje." };
    if (!isAdminRole(auth.role) && lead.ownerId !== auth.userId) {
      return { success: false, error: "Brak dostepu do tego leada." };
    }

    const deal = await prisma.deal.create({
      data: {
        name,
        value: parseFloat(value) || 0,
        currency: currency || "PLN",
        probability: Math.min(100, Math.max(0, parseInt(probability) || 50)),
        expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
        stage: ALLOWED_DEAL_STAGES.includes(stage) ? stage : "DISCOVERY",
        notes: notes || null,
        leadId,
        ownerId: auth.userId,
      },
      include: { lead: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });

    revalidatePath("/dashboard/deals");
    revalidatePath("/dashboard");
    return { success: true, deal };
  } catch (error) {
    console.error("createDeal error:", error);
    return { success: false, error: "Nie udalo sie utworzyc deala." };
  }
}

export async function getDeals() {
  try {
    const auth = await requireCreator();
    if (!auth.ok) return [];

    return await prisma.deal.findMany({
      where: isAdminRole(auth.role) ? {} : { ownerId: auth.userId },
      include: {
        lead: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("getDeals error:", error);
    return [];
  }
}

export async function updateDeal(dealId, data) {
  try {
    const auth = await requireCreator();
    if (!auth.ok) return { success: false, error: auth.error };

    if (!dealId) return { success: false, error: "Brak ID deala." };

    const existing = await prisma.deal.findUnique({
      where: { id: dealId },
      select: { ownerId: true },
    });
    if (!existing) return { success: false, error: "Deal nie istnieje." };
    if (!isAdminRole(auth.role) && existing.ownerId !== auth.userId) {
      return { success: false, error: "Brak dostepu do tego deala." };
    }

    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.value !== undefined) updateData.value = parseFloat(data.value) || 0;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.probability !== undefined)
      updateData.probability = Math.min(100, Math.max(0, parseInt(data.probability) || 50));
    if (data.expectedCloseDate !== undefined)
      updateData.expectedCloseDate = data.expectedCloseDate ? new Date(data.expectedCloseDate) : null;
    if (data.notes !== undefined) updateData.notes = data.notes || null;

    const deal = await prisma.deal.update({
      where: { id: dealId },
      data: updateData,
      include: { lead: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });

    revalidatePath("/dashboard/deals");
    return { success: true, deal };
  } catch (error) {
    console.error("updateDeal error:", error);
    return { success: false, error: "Nie udalo sie zaktualizowac deala." };
  }
}

export async function updateDealStage(dealId, newStage) {
  try {
    const auth = await requireCreator();
    if (!auth.ok) return { success: false, error: auth.error };

    if (!dealId) return { success: false, error: "Brak ID deala." };
    if (!ALLOWED_DEAL_STAGES.includes(newStage)) {
      return { success: false, error: "Nieprawidlowy etap deala." };
    }

    const existing = await prisma.deal.findUnique({
      where: { id: dealId },
      select: { ownerId: true, stage: true, leadId: true },
    });
    if (!existing) return { success: false, error: "Deal nie istnieje." };
    if (!isAdminRole(auth.role) && existing.ownerId !== auth.userId) {
      return { success: false, error: "Brak dostepu do tego deala." };
    }

    const previousStage = existing.stage;

    const deal = await prisma.deal.update({
      where: { id: dealId },
      data: { stage: newStage },
      include: { lead: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });

    try {
      const { executeAutomations } = await import("@/lib/automationEngine");
      await executeAutomations("DEAL_STAGE_CHANGE", {
        dealId,
        leadId: existing.leadId,
        fromStage: previousStage,
        toStage: newStage,
        ownerId: auth.userId,
      });
    } catch (_) {
      // best-effort
    }

    revalidatePath("/dashboard/deals");
    revalidatePath("/dashboard");
    return { success: true, deal };
  } catch (error) {
    console.error("updateDealStage error:", error);
    return { success: false, error: "Nie udalo sie zmienic etapu deala." };
  }
}

export async function getDealStats() {
  try {
    const auth = await requireCreator();
    if (!auth.ok) {
      return { totalDeals: 0, totalValue: 0, weightedPipeline: 0, wonDeals: 0 };
    }

    const where = isAdminRole(auth.role) ? {} : { ownerId: auth.userId };
    const deals = await prisma.deal.findMany({ where });

    const totalDeals = deals.length;
    const totalValue = deals.reduce((sum, d) => sum + d.value, 0);
    const weightedPipeline = deals
      .filter((d) => d.stage !== "WON" && d.stage !== "LOST")
      .reduce((sum, d) => sum + d.value * (d.probability / 100), 0);
    const wonDeals = deals.filter((d) => d.stage === "WON").length;

    return { totalDeals, totalValue, weightedPipeline, wonDeals };
  } catch (error) {
    console.error("getDealStats error:", error);
    return { totalDeals: 0, totalValue: 0, weightedPipeline: 0, wonDeals: 0 };
  }
}

export async function deleteDeal(dealId) {
  try {
    const auth = await requireCreator();
    if (!auth.ok) return { success: false, error: auth.error };

    if (!dealId) return { success: false, error: "Brak ID deala." };

    const existing = await prisma.deal.findUnique({
      where: { id: dealId },
      select: { ownerId: true },
    });
    if (!existing) return { success: false, error: "Deal nie istnieje." };
    if (!isAdminRole(auth.role) && existing.ownerId !== auth.userId) {
      return { success: false, error: "Brak dostepu do tego deala." };
    }

    await prisma.deal.delete({ where: { id: dealId } });

    revalidatePath("/dashboard/deals");
    return { success: true };
  } catch (error) {
    console.error("deleteDeal error:", error);
    return { success: false, error: "Nie udalo sie usunac deala." };
  }
}
