"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireCreator, isAdminRole } from "@/lib/rbac";

const VALID_TRIGGERS = ["LEAD_STATUS_CHANGE", "DEAL_STAGE_CHANGE"];
const VALID_ACTIONS = ["SEND_EMAIL_TEMPLATE", "CREATE_TASK"];

export async function getAutomationRules() {
  try {
    const auth = await requireCreator();
    if (!auth.ok) return [];

    return await prisma.automationRule.findMany({
      where: isAdminRole(auth.role) ? {} : { ownerId: auth.userId },
      include: { _count: { select: { logs: true } } },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("getAutomationRules error:", error);
    return [];
  }
}

export async function createAutomationRule(data) {
  try {
    const auth = await requireCreator();
    if (!auth.ok) return { success: false, error: auth.error };

    const { name, triggerType, triggerConfig, actionType, actionConfig } = data;

    if (!name || !triggerType || !actionType) {
      return { success: false, error: "Nazwa, trigger i akcja sa wymagane." };
    }
    if (!VALID_TRIGGERS.includes(triggerType)) {
      return { success: false, error: "Nieprawidlowy typ triggera." };
    }
    if (!VALID_ACTIONS.includes(actionType)) {
      return { success: false, error: "Nieprawidlowy typ akcji." };
    }

    const rule = await prisma.automationRule.create({
      data: {
        name,
        triggerType,
        triggerConfig: triggerConfig || {},
        actionType,
        actionConfig: actionConfig || {},
        ownerId: auth.userId,
      },
    });

    revalidatePath("/dashboard/automatyzacje");
    return { success: true, rule };
  } catch (error) {
    console.error("createAutomationRule error:", error);
    return { success: false, error: "Nie udalo sie utworzyc reguly." };
  }
}

export async function updateAutomationRule(ruleId, data) {
  try {
    const auth = await requireCreator();
    if (!auth.ok) return { success: false, error: auth.error };

    if (!ruleId) return { success: false, error: "Brak ID reguly." };

    const existing = await prisma.automationRule.findUnique({
      where: { id: ruleId },
      select: { ownerId: true },
    });
    if (!existing) return { success: false, error: "Regula nie istnieje." };
    if (!isAdminRole(auth.role) && existing.ownerId !== auth.userId) {
      return { success: false, error: "Brak dostepu do tej reguly." };
    }

    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.triggerType !== undefined) {
      if (!VALID_TRIGGERS.includes(data.triggerType)) {
        return { success: false, error: "Nieprawidlowy typ triggera." };
      }
      updateData.triggerType = data.triggerType;
    }
    if (data.triggerConfig !== undefined) updateData.triggerConfig = data.triggerConfig;
    if (data.actionType !== undefined) {
      if (!VALID_ACTIONS.includes(data.actionType)) {
        return { success: false, error: "Nieprawidlowy typ akcji." };
      }
      updateData.actionType = data.actionType;
    }
    if (data.actionConfig !== undefined) updateData.actionConfig = data.actionConfig;

    const rule = await prisma.automationRule.update({
      where: { id: ruleId },
      data: updateData,
    });

    revalidatePath("/dashboard/automatyzacje");
    return { success: true, rule };
  } catch (error) {
    console.error("updateAutomationRule error:", error);
    return { success: false, error: "Nie udalo sie zaktualizowac reguly." };
  }
}

export async function toggleAutomationRule(ruleId) {
  try {
    const auth = await requireCreator();
    if (!auth.ok) return { success: false, error: auth.error };

    if (!ruleId) return { success: false, error: "Brak ID reguly." };

    const existing = await prisma.automationRule.findUnique({
      where: { id: ruleId },
      select: { ownerId: true, isActive: true },
    });
    if (!existing) return { success: false, error: "Regula nie istnieje." };
    if (!isAdminRole(auth.role) && existing.ownerId !== auth.userId) {
      return { success: false, error: "Brak dostepu do tej reguly." };
    }

    const rule = await prisma.automationRule.update({
      where: { id: ruleId },
      data: { isActive: !existing.isActive },
    });

    revalidatePath("/dashboard/automatyzacje");
    return { success: true, rule };
  } catch (error) {
    console.error("toggleAutomationRule error:", error);
    return { success: false, error: "Nie udalo sie przelaczyl reguly." };
  }
}

export async function deleteAutomationRule(ruleId) {
  try {
    const auth = await requireCreator();
    if (!auth.ok) return { success: false, error: auth.error };

    if (!ruleId) return { success: false, error: "Brak ID reguly." };

    const existing = await prisma.automationRule.findUnique({
      where: { id: ruleId },
      select: { ownerId: true },
    });
    if (!existing) return { success: false, error: "Regula nie istnieje." };
    if (!isAdminRole(auth.role) && existing.ownerId !== auth.userId) {
      return { success: false, error: "Brak dostepu do tej reguly." };
    }

    await prisma.automationRule.delete({ where: { id: ruleId } });

    revalidatePath("/dashboard/automatyzacje");
    return { success: true };
  } catch (error) {
    console.error("deleteAutomationRule error:", error);
    return { success: false, error: "Nie udalo sie usunac reguly." };
  }
}

export async function getAutomationLogs(ruleId) {
  try {
    const auth = await requireCreator();
    if (!auth.ok) return [];

    const where = {};
    if (ruleId) {
      const rule = await prisma.automationRule.findUnique({
        where: { id: ruleId },
        select: { ownerId: true },
      });
      if (!rule) return [];
      if (!isAdminRole(auth.role) && rule.ownerId !== auth.userId) return [];
      where.automationId = ruleId;
    } else {
      if (!isAdminRole(auth.role)) {
        where.automation = { ownerId: auth.userId };
      }
    }

    return await prisma.automationLog.findMany({
      where,
      include: {
        automation: { select: { id: true, name: true } },
      },
      orderBy: { executedAt: "desc" },
      take: 100,
    });
  } catch (error) {
    console.error("getAutomationLogs error:", error);
    return [];
  }
}
