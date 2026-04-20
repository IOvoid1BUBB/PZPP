import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createNotification,
  NOTIFICATION_TYPES,
  listNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications";

export async function GET(request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") || 20);

  try {
    const result = await listNotificationsForUser(userId, { limit });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("notifications.GET:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const action = typeof body?.action === "string" ? body.action : "";
  const id = typeof body?.id === "string" ? body.id : null;

  try {
    if (action === "markAllRead") {
      await markAllNotificationsRead(userId);
      return NextResponse.json({ success: true });
    }
    if (action === "markRead") {
      await markNotificationRead(userId, id);
      return NextResponse.json({ success: true });
    }

    if (action === "createCalendarEvent") {
      const eventId = typeof body?.eventId === "string" ? body.eventId : "";
      const title = typeof body?.title === "string" ? body.title.trim() : "";
      const source = typeof body?.source === "string" ? body.source.trim() : "";
      const url = typeof body?.url === "string" ? body.url : null;

      if (!eventId || !title) {
        return NextResponse.json({ success: false, error: "Missing eventId/title" }, { status: 400 });
      }

      // De-dupe: if we already have a notification for this event, skip.
      const exists = await prisma.notification.findFirst({
        where: {
          userId,
          type: NOTIFICATION_TYPES.CALENDAR_EVENT_CREATED,
          entityId: eventId,
        },
        select: { id: true },
      });
      if (exists) return NextResponse.json({ success: true, skipped: true });

      await createNotification({
        userId,
        type: NOTIFICATION_TYPES.CALENDAR_EVENT_CREATED,
        title: source ? `Nowe wydarzenie (${source})` : "Nowe wydarzenie",
        body: title,
        url,
        entityId: eventId,
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("notifications.POST:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

