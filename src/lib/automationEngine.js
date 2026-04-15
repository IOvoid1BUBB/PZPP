import { prisma } from "@/lib/prisma";

/**
 * Finds active automation rules matching the trigger and executes their actions.
 * Best-effort: failures are logged but never thrown to the caller.
 */
export async function executeAutomations(triggerType, context) {
  try {
    const rules = await prisma.automationRule.findMany({
      where: { triggerType, isActive: true, ownerId: context.ownerId },
    });

    for (const rule of rules) {
      try {
        if (!matchesTrigger(rule, triggerType, context)) continue;
        await executeAction(rule, context);
        await prisma.automationLog.create({
          data: {
            automationId: rule.id,
            leadId: context.leadId || null,
            dealId: context.dealId || null,
            status: "SUCCESS",
            details: `Executed ${rule.actionType} for ${triggerType}`,
          },
        });
      } catch (err) {
        console.error(`Automation rule ${rule.id} failed:`, err);
        await prisma.automationLog
          .create({
            data: {
              automationId: rule.id,
              leadId: context.leadId || null,
              dealId: context.dealId || null,
              status: "FAILURE",
              details: err?.message || String(err),
            },
          })
          .catch(() => {});
      }
    }
  } catch (err) {
    console.error("executeAutomations error:", err);
  }
}

function matchesTrigger(rule, triggerType, context) {
  const cfg = rule.triggerConfig || {};

  if (triggerType === "LEAD_STATUS_CHANGE") {
    if (cfg.fromStatus && cfg.fromStatus !== context.fromStatus) return false;
    if (cfg.toStatus && cfg.toStatus !== context.toStatus) return false;
    return true;
  }

  if (triggerType === "DEAL_STAGE_CHANGE") {
    if (cfg.fromStage && cfg.fromStage !== context.fromStage) return false;
    if (cfg.toStage && cfg.toStage !== context.toStage) return false;
    return true;
  }

  return false;
}

async function executeAction(rule, context) {
  const cfg = rule.actionConfig || {};

  if (rule.actionType === "SEND_EMAIL_TEMPLATE") {
    const { sendTemplatedEmail } = await import("@/app/actions/messageActions");
    const lead = await prisma.lead.findUnique({
      where: { id: context.leadId },
      select: { id: true, email: true, firstName: true, lastName: true },
    });
    if (!lead) throw new Error("Lead not found for email action");

    const templateProps = {
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      ...cfg.templateProps,
    };

    await sendTemplatedEmail(lead.id, lead.email, cfg.templateName, templateProps);
    return;
  }

  if (rule.actionType === "CREATE_TASK") {
    const dueDays = parseInt(cfg.dueDays) || 1;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + dueDays);

    await prisma.task.create({
      data: {
        title: cfg.title || "Zadanie z automatyzacji",
        description: cfg.description || null,
        dueDate,
        priority: cfg.priority || "MEDIUM",
        type: cfg.taskType || "FOLLOW_UP",
        leadId: context.leadId,
        userId: context.ownerId,
        dealId: context.dealId || null,
      },
    });
    return;
  }

  throw new Error(`Unknown action type: ${rule.actionType}`);
}
