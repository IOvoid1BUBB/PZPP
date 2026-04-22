"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { canAccessLead, requireCreator, isAdminRole } from "@/lib/rbac";
import { createNotification, NOTIFICATION_TYPES } from "@/lib/notifications";

function toDateSafe(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
}

export async function getLead360Profile(leadId) {
  if (!leadId || typeof leadId !== "string") {
    return { success: false, error: "Nieprawidlowe ID leada." };
  }

  try {
    const baseLead = await prisma.lead.findUnique({ where: { id: leadId }, select: { id: true, email: true, ownerId: true } });
    const access = await canAccessLead(baseLead);
    if (!access.ok) return { success: false, error: access.error };

    let lead;
    try {
      lead = await prisma.lead.findUnique({
        where: { id: leadId },
        include: {
          notes: true,
          messages: true,
          meetings: true,
          documents: true,
          tasks: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          customFields: true,
          tags: true,
        },
      });
    } catch (error) {
      const message = error?.message || "";
      const missingTasksRelation =
        message.includes("Unknown field `tasks`") ||
        message.includes("relation `Task` does not exist") ||
        message.includes("table") && message.includes("Task");

      if (!missingTasksRelation) throw error;

      // Fallback for environments where Task migration/client is not applied yet.
      lead = await prisma.lead.findUnique({
        where: { id: leadId },
        include: {
          notes: true,
          messages: true,
          meetings: true,
          documents: true,
          customFields: true,
          tags: true,
        },
      });
      lead = { ...lead, tasks: [] };
    }

    if (!lead) {
      return { success: false, error: "Lead nie istnieje." };
    }

    const timelineEvents = [
      ...lead.notes.map((note) => ({
        id: note.id,
        date: note.createdAt,
        type: "NOTE",
        data: note,
      })),
      ...lead.messages.map((message) => ({
        id: message.id,
        date: message.createdAt,
        type: "MESSAGE",
        data: message,
      })),
      ...lead.meetings.map((meeting) => ({
        id: meeting.id,
        date: meeting.startTime ?? meeting.createdAt,
        type: "MEETING",
        data: meeting,
      })),
      ...lead.documents.map((document) => ({
        id: document.id,
        date: document.createdAt,
        type: "DOCUMENT",
        data: document,
      })),
      ...(lead.tasks || []).map((task) => ({
        id: task.id,
        date: task.dueDate ?? task.createdAt,
        type: "TASK",
        data: task,
      })),
    ].sort((a, b) => toDateSafe(b.date) - toDateSafe(a.date));

    return {
      success: true,
      lead,
      timelineEvents,
    };
  } catch (error) {
    console.error("getLead360Profile error:", error);
    return { success: false, error: "Nie udalo sie pobrac profilu 360." };
  }
}

export async function addNoteToLead(leadId, content) {
  if (!leadId || typeof leadId !== "string") {
    return { success: false, error: "Nieprawidlowe ID leada." };
  }

  if (!content || typeof content !== "string" || content.trim().length < 2) {
    return { success: false, error: "Notatka jest za krotka." };
  }

  try {
    const auth = await requireCreator();
    if (!auth.ok) return { success: false, error: auth.error };
    const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { ownerId: true } });
    if (!lead) return { success: false, error: "Lead nie istnieje." };
    if (!isAdminRole(auth.role) && lead.ownerId !== auth.userId) {
      return { success: false, error: "Brak dostępu do tego leada." };
    }

    const note = await prisma.note.create({
      data: {
        content: content.trim(),
        leadId,
      },
    });

    revalidatePath("/crm");
    return { success: true, note };
  } catch (error) {
    console.error("addNoteToLead error:", error);
    return { success: false, error: "Nie udalo sie dodac notatki." };
  }
}

export async function addTaskToLead(leadId, taskData) {
  if (!leadId || typeof leadId !== "string") {
    return { success: false, error: "Nieprawidlowe ID leada." };
  }

  const title = taskData?.title?.trim();
  const description = taskData?.description?.trim() || null;
  const dueDateRaw = taskData?.dueDate;
  const userId = taskData?.userId;
  const isCompleted = Boolean(taskData?.isCompleted);

  if (!title || title.length < 2) {
    return { success: false, error: "Tytul zadania jest wymagany." };
  }

  if (!dueDateRaw) {
    return { success: false, error: "Termin zadania jest wymagany." };
  }

  if (!userId || typeof userId !== "string") {
    return { success: false, error: "Przypisanie do pracownika jest wymagane." };
  }

  const dueDate = new Date(dueDateRaw);
  if (Number.isNaN(dueDate.getTime())) {
    return { success: false, error: "Nieprawidlowa data zadania." };
  }

  try {
    const auth = await requireCreator();
    if (!auth.ok) return { success: false, error: auth.error };
    const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { ownerId: true } });
    if (!lead) return { success: false, error: "Lead nie istnieje." };
    if (!isAdminRole(auth.role) && lead.ownerId !== auth.userId) {
      return { success: false, error: "Brak dostępu do tego leada." };
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        dueDate,
        isCompleted,
        leadId,
        userId: isAdminRole(auth.role) ? userId : auth.userId,
      },
    });

    await createNotification({
      userId: task.userId,
      type: NOTIFICATION_TYPES.TASK_CREATED,
      title: "Nowe zadanie",
      body: title,
      url: `/dashboard/zadania?taskId=${encodeURIComponent(task.id)}`,
      entityId: task.id,
    }).catch(() => null);

    revalidatePath("/crm");
    return { success: true, task };
  } catch (error) {
    console.error("addTaskToLead error:", error);
    const message = error?.message || "";
    const missingTaskTable =
      message.includes("relation `Task` does not exist") ||
      message.includes("table") && message.includes("Task") ||
      message.includes("Cannot read properties of undefined");
    if (missingTaskTable) {
      return {
        success: false,
        error: "Model Task nie jest jeszcze wdrozony w bazie. Uruchom migracje Prisma.",
      };
    }
    return { success: false, error: "Nie udalo sie dodac zadania." };
  }
}
