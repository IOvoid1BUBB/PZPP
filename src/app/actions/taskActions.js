"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireCreator, isAdminRole } from "@/lib/rbac";

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export async function getTasks(filter = "all") {
  try {
    const auth = await requireCreator();
    if (!auth.ok) return [];

    const baseWhere = isAdminRole(auth.role) ? {} : { userId: auth.userId };
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    let where = { ...baseWhere };

    switch (filter) {
      case "today":
        where = { ...baseWhere, isCompleted: false, dueDate: { gte: todayStart, lte: todayEnd } };
        break;
      case "overdue":
        where = { ...baseWhere, isCompleted: false, dueDate: { lt: todayStart } };
        break;
      case "upcoming":
        where = { ...baseWhere, isCompleted: false, dueDate: { gt: todayEnd } };
        break;
      case "completed":
        where = { ...baseWhere, isCompleted: true };
        break;
      default:
        break;
    }

    return await prisma.task.findMany({
      where,
      include: {
        lead: { select: { id: true, firstName: true, lastName: true, email: true } },
        deal: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { dueDate: "asc" },
    });
  } catch (error) {
    console.error("getTasks error:", error);
    return [];
  }
}

export async function getTasksDashboard() {
  try {
    const auth = await requireCreator();
    if (!auth.ok) {
      return { todayTasks: 0, overdueTasks: 0, upcomingTasks: 0, completedToday: 0 };
    }

    const baseWhere = isAdminRole(auth.role) ? {} : { userId: auth.userId };
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    const [todayTasks, overdueTasks, upcomingTasks, completedToday] = await Promise.all([
      prisma.task.count({
        where: { ...baseWhere, isCompleted: false, dueDate: { gte: todayStart, lte: todayEnd } },
      }),
      prisma.task.count({
        where: { ...baseWhere, isCompleted: false, dueDate: { lt: todayStart } },
      }),
      prisma.task.count({
        where: { ...baseWhere, isCompleted: false, dueDate: { gt: todayEnd } },
      }),
      prisma.task.count({
        where: { ...baseWhere, isCompleted: true, updatedAt: { gte: todayStart, lte: todayEnd } },
      }),
    ]);

    return { todayTasks, overdueTasks, upcomingTasks, completedToday };
  } catch (error) {
    console.error("getTasksDashboard error:", error);
    return { todayTasks: 0, overdueTasks: 0, upcomingTasks: 0, completedToday: 0 };
  }
}

export async function toggleTaskComplete(taskId) {
  try {
    const auth = await requireCreator();
    if (!auth.ok) return { success: false, error: auth.error };

    if (!taskId) return { success: false, error: "Brak ID zadania." };

    const existing = await prisma.task.findUnique({
      where: { id: taskId },
      select: { userId: true, isCompleted: true },
    });
    if (!existing) return { success: false, error: "Zadanie nie istnieje." };
    if (!isAdminRole(auth.role) && existing.userId !== auth.userId) {
      return { success: false, error: "Brak dostepu do tego zadania." };
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data: { isCompleted: !existing.isCompleted },
    });

    revalidatePath("/dashboard/zadania");
    revalidatePath("/dashboard");
    return { success: true, task };
  } catch (error) {
    console.error("toggleTaskComplete error:", error);
    return { success: false, error: "Nie udalo sie zmienic statusu zadania." };
  }
}

export async function updateTask(taskId, data) {
  try {
    const auth = await requireCreator();
    if (!auth.ok) return { success: false, error: auth.error };

    if (!taskId) return { success: false, error: "Brak ID zadania." };

    const existing = await prisma.task.findUnique({
      where: { id: taskId },
      select: { userId: true },
    });
    if (!existing) return { success: false, error: "Zadanie nie istnieje." };
    if (!isAdminRole(auth.role) && existing.userId !== auth.userId) {
      return { success: false, error: "Brak dostepu do tego zadania." };
    }

    const updateData = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description || null;
    if (data.dueDate !== undefined) updateData.dueDate = new Date(data.dueDate);
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.isCompleted !== undefined) updateData.isCompleted = data.isCompleted;

    const task = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
    });

    revalidatePath("/dashboard/zadania");
    return { success: true, task };
  } catch (error) {
    console.error("updateTask error:", error);
    return { success: false, error: "Nie udalo sie zaktualizowac zadania." };
  }
}

export async function deleteTask(taskId) {
  try {
    const auth = await requireCreator();
    if (!auth.ok) return { success: false, error: auth.error };

    if (!taskId) return { success: false, error: "Brak ID zadania." };

    const existing = await prisma.task.findUnique({
      where: { id: taskId },
      select: { userId: true },
    });
    if (!existing) return { success: false, error: "Zadanie nie istnieje." };
    if (!isAdminRole(auth.role) && existing.userId !== auth.userId) {
      return { success: false, error: "Brak dostepu do tego zadania." };
    }

    await prisma.task.delete({ where: { id: taskId } });

    revalidatePath("/dashboard/zadania");
    return { success: true };
  } catch (error) {
    console.error("deleteTask error:", error);
    return { success: false, error: "Nie udalo sie usunac zadania." };
  }
}
