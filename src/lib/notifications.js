import { prisma } from "@/lib/prisma";

export const NOTIFICATION_TYPES = {
  ORDER_CREATED: "ORDER_CREATED",
  MESSAGE_RECEIVED: "MESSAGE_RECEIVED",
  TASK_CREATED: "TASK_CREATED",
  MEETING_CREATED: "MEETING_CREATED",
  CALENDAR_EVENT_CREATED: "CALENDAR_EVENT_CREATED",
};

export async function createNotification({
  userId,
  type,
  title,
  body = null,
  url = null,
  entityId = null,
}) {
  if (!userId) return null;
  return prisma.notification.create({
    data: {
      userId,
      type,
      title,
      body,
      url,
      entityId,
    },
  });
}

export async function listNotificationsForUser(userId, { limit = 20 } = {}) {
  const safeLimit = Math.max(1, Math.min(50, Number(limit) || 20));
  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: safeLimit,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        url: true,
        entityId: true,
        createdAt: true,
        readAt: true,
      },
    }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);

  return { items, unreadCount };
}

export async function markNotificationRead(userId, notificationId) {
  if (!notificationId) return null;
  return prisma.notification.updateMany({
    where: { id: notificationId, userId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function markAllNotificationsRead(userId) {
  return prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}

