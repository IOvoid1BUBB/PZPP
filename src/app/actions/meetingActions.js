"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { addLeadActivity } from "@/app/actions/scoringActions";
import { requireCreatorOrAdmin, isAdminRole } from "@/lib/rbac";
import { getOAuthAccountOrThrow } from "@/lib/integrations/oauthAccounts";
import { fetchGoogleCalendarEvents as fetchGoogleCalendarEventsByUser } from "@/lib/integrations/googleClient";
import { createNotification, NOTIFICATION_TYPES } from "@/lib/notifications";

function toDate(value, fieldName) {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  throw new Error(`Nieprawidłowa wartość "${fieldName}".`);
}

/**
 * Pobiera spotkania, których zakres czasu przecina przedział [startDate, endDate).
 * Query jest zoptymalizowane: zwracamy tylko wydarzenia z aktualnego zakresu widoku kalendarza.
 *
 * @param {string|Date} startDate
 * @param {string|Date} endDate
 */
export async function getMeetings(startDate, endDate) {
  try {
    const auth = await requireCreatorOrAdmin();
    if (!auth.ok) return [];

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start) || isNaN(end) || end <= start) return [];

    const meetings = await prisma.meeting.findMany({
      where: {
        startTime: { lt: end },
        endTime: { gt: start },
        ...(auth.role === "ADMIN" ? {} : { organizerId: auth.userId }),
      },
      orderBy: { startTime: "asc" },
    });

    revalidatePath("/dashboard/calendar");

    return meetings.map((m) => ({
      ...m,
      startTime: m.startTime.toISOString(),
      endTime: m.endTime.toISOString(),
    }));
  } catch (error) {
    console.error("getMeetings error:", error);
    return [];
  }
}

function toIsoDateOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function buildRescheduleLink(meetingId) {
  const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "";
  const relativePath = `/dashboard/calendar/reschedule?meetingId=${encodeURIComponent(meetingId)}`;
  return appUrl ? `${appUrl}${relativePath}` : relativePath;
}

function toReminderSchedule(startTime, offsetHours) {
  const startMs = new Date(startTime).getTime();
  if (Number.isNaN(startMs)) return null;
  return new Date(startMs - offsetHours * 60 * 60 * 1000);
}

export async function buildMeetingReminderJobs({
  meetingId,
  title,
  startTime,
  participantUserIds = [],
}) {
  if (!meetingId || !startTime) return [];

  const uniqueParticipants = [...new Set((participantUserIds || []).filter(Boolean))];
  const rescheduleLink = buildRescheduleLink(meetingId);

  return [24, 1]
    .map((hoursBefore) => {
      const scheduledFor = toReminderSchedule(startTime, hoursBefore);
      if (!scheduledFor) return null;

      return {
        type: "MEETING_REMINDER",
        channels: ["EMAIL", "SMS"],
        meetingId,
        meetingTitle: title || "Spotkanie",
        hoursBefore,
        scheduledFor: scheduledFor.toISOString(),
        participantUserIds: uniqueParticipants,
        payload: {
          rescheduleLink,
          reminderLabel: `${hoursBefore}h`,
        },
      };
    })
    .filter(Boolean);
}

/**
 * Szkielet dispatcher'a przypomnień.
 * Docelowo funkcja może być uruchamiana przez CRON/queue worker.
 */
export async function sendMeetingReminders(meetingId, participantUserIds = []) {
  try {
    if (!meetingId || typeof meetingId !== "string") {
      return { success: false, error: "Nieprawidłowe ID spotkania." };
    }

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      select: {
        id: true,
        title: true,
        startTime: true,
      },
    });

    if (!meeting) return { success: false, error: "Spotkanie nie istnieje." };

    const jobs = buildMeetingReminderJobs({
      meetingId: meeting.id,
      title: meeting.title,
      startTime: meeting.startTime,
      participantUserIds,
    });

    // TODO: Podłączyć realny provider e-mail/SMS i kolejkę zadań.
    // Na ten etap zwracamy gotowy plan wysyłki (24h i 1h) wraz z linkiem do przełożenia.
    return {
      success: true,
      remindersPlanned: jobs.length,
      jobs,
    };
  } catch (error) {
    console.error("sendMeetingReminders:", error);
    return { success: false, error: "Nie udało się przygotować przypomnień." };
  }
}

function toUnifiedEvent(item) {
  const start = toIsoDateOrNull(item?.start);
  const end = toIsoDateOrNull(item?.end);
  if (!start || !end) return null;

  return {
    id: item.id,
    title: item.title || "Bez tytułu",
    start,
    end,
    source: item.source,
    externalUrl: item.externalUrl || null,
    createdAt: item.createdAt || null,
  };
}

async function fetchOutlookCalendarEvents(account, rangeStart, rangeEnd) {
  try {
    if (!account?.access_token) return [];
    const params = new URLSearchParams({
      $top: "200",
      $orderby: "start/dateTime",
      startDateTime: rangeStart.toISOString(),
      endDateTime: rangeEnd.toISOString(),
    });

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/calendarView?${params.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${account.access_token}`,
          "Content-Type": "application/json",
          Prefer: 'outlook.timezone="UTC"',
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error(`Microsoft Graph API error: ${response.status}`);
    }

    const data = await response.json();
    const items = Array.isArray(data?.value) ? data.value : [];

    return items
      .map((event) =>
        toUnifiedEvent({
          id: `outlook-${event.id}`,
          title: event.subject,
          start: event?.start?.dateTime,
          end: event?.end?.dateTime,
          source: "outlook",
          externalUrl: event?.webLink || null,
          createdAt: event?.createdDateTime || null,
        })
      )
      .filter(Boolean);
  } catch (error) {
    console.error("fetchOutlookCalendarEvents:", error);
    throw error;
  }
}

/**
 * Zwraca ujednoliconą listę wydarzeń z lokalnej bazy oraz integracji OAuth.
 * Błędy z zewnętrznych providerów nie przerywają działania kalendarza.
 *
 * @param {string | null | undefined} userId
 * @param {string|Date} startDate
 * @param {string|Date} endDate
 */
export async function getUnifiedCalendarEvents(
  userId,
  startDate,
  endDate
) {
  try {
    const auth = await requireCreatorOrAdmin();
    if (!auth.ok) return [];

    const start = toDate(startDate, "startDate");
    const end = toDate(endDate, "endDate");
    if (end <= start) return [];

    const requestedUserId = typeof userId === "string" ? userId : null;
    const resolvedUserId =
      isAdminRole(auth.role) && requestedUserId ? requestedUserId : auth.userId;

    const [localMeetings, outlookAccountResult] = await Promise.all([
      prisma.meeting.findMany({
        where: {
          startTime: { lt: end },
          endTime: { gt: start },
          ...(resolvedUserId ? { organizerId: resolvedUserId } : {}),
        },
        orderBy: { startTime: "asc" },
        select: {
          id: true,
          title: true,
          startTime: true,
          endTime: true,
          meetLink: true,
        },
      }),
      resolvedUserId
        ? getOAuthAccountOrThrow(resolvedUserId, "azure-ad").catch(() => null)
        : Promise.resolve(null),
    ]);

    const outlookAccount = outlookAccountResult;

    const externalResults = await Promise.allSettled([
      resolvedUserId ? fetchGoogleCalendarEventsByUser(resolvedUserId, start, end) : [],
      outlookAccount ? fetchOutlookCalendarEvents(outlookAccount, start, end) : [],
    ]);

    const externalEvents = externalResults
      .flatMap((result) => {
        if (result.status === "fulfilled") return result.value || [];
        console.error(
          "getUnifiedCalendarEvents external provider error:",
          result.reason
        );
        return [];
      })
      .filter(Boolean);

    // Asynchronously create notifications for recently created external events
    // to ensure users are notified even if they don't have the calendar open.
    if (resolvedUserId) {
      Promise.resolve().then(async () => {
        try {
          const recentEvents = externalEvents.filter((ev) => {
            if (!ev.createdAt) return false;
            return Date.now() - new Date(ev.createdAt).getTime() < 10 * 1000;
          });

          for (const ev of recentEvents) {
            const exists = await prisma.notification.findFirst({
              where: {
                userId: resolvedUserId,
                type: NOTIFICATION_TYPES.CALENDAR_EVENT_CREATED,
                entityId: ev.id,
              },
              select: { id: true },
            });
            if (!exists) {
              await createNotification({
                userId: resolvedUserId,
                type: NOTIFICATION_TYPES.CALENDAR_EVENT_CREATED,
                title: ev.source ? `Nowe wydarzenie (${ev.source})` : "Nowe wydarzenie",
                body: ev.title,
                url: `/dashboard/calendar?eventId=${encodeURIComponent(ev.id)}`,
                entityId: ev.id,
              });
            }
          }
        } catch (e) {
          console.error("Background notification creation failed:", e);
        }
      });
    }

    const localEvents = localMeetings
      .map((meeting) =>
        toUnifiedEvent({
          id: meeting.id,
          title: meeting.title,
          start: meeting.startTime,
          end: meeting.endTime,
          source: "local",
          externalUrl: meeting.meetLink || null,
        })
      )
      .filter(Boolean);

    return [...localEvents, ...externalEvents].sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
    );
  } catch (error) {
    console.error("getUnifiedCalendarEvents:", error);
    return [];
  }
}

/**
 * Tworzy nowe spotkanie.
 *
 * @param {{
 *  title: string,
 *  meetLink?: string|null,
 *  startTime: string|Date,
 *  endTime: string|Date
 * }} data
 */
export async function createMeeting(data) {
  try {
    const auth = await requireCreatorOrAdmin();
    if (!auth.ok) return { success: false, error: auth.error };

    const title = typeof data?.title === "string" ? data.title.trim() : "";
    const meetLinkRaw = data?.meetLink;

    if (!title)
      return { success: false, error: "Tytuł spotkania jest wymagany." };

    const organizerId = auth.userId;

    const startTime = toDate(data?.startTime, "startTime");
    const endTime = toDate(data?.endTime, "endTime");

    if (endTime <= startTime) {
      return {
        success: false,
        error: "Czas zakończenia musi być późniejszy niż czas rozpoczęcia.",
      };
    }
    const meetLink =
      typeof meetLinkRaw === "string"
        ? meetLinkRaw.trim() || null
        : (meetLinkRaw ?? null);

    // TODO: Dla synchronizacji 2-way po utworzeniu lokalnego spotkania
    // należy wykonać mutację do Google/Outlook i zapisać external event id.

    const meeting = await prisma.meeting.create({
      data: {
        title,
        startTime,
        endTime,
        meetLink,
        organizerId,
        leadId: data?.leadId || null,
      },
      select: {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
        meetLink: true,
        organizerId: true,
        leadId: true,
      },
    });

    await createNotification({
      userId: organizerId,
      type: NOTIFICATION_TYPES.MEETING_CREATED,
      title: "Nowe spotkanie",
      body: meeting.title,
      url: `/dashboard/calendar?eventId=${encodeURIComponent(meeting.id)}`,
      entityId: meeting.id,
    }).catch(() => null);

    if (meeting.leadId) {
      // Importuj addLeadActivity na górze pliku meetingActions.js
      await addLeadActivity(meeting.leadId, "MEETING_SCHEDULED");
    }

    revalidatePath("/dashboard/calendar");
    revalidatePath("/dashboard");

    return {
      success: true,
      meeting: {
        id: meeting.id,
        title: meeting.title,
        startTime: meeting.startTime.toISOString(),
        endTime: meeting.endTime.toISOString(),
        meetLink: meeting.meetLink,
        organizerId: meeting.organizerId,
        leadId: meeting.leadId,
      },
    };
  } catch (error) {
    //Wyłapywanie błędu unikalności z bazy danych (zapobieganie dublowaniu)
    if (error.code === "P2002") {
      return {
        success: false,
        error:
          "Ten termin jest już zajęty! Ktoś inny zdążył zarezerwować tę samą godzinę.",
      };
    }

    // Standardowe łapanie pozostałych błędów
    return {
      success: false,
      error: "Wystąpił błąd serwera podczas tworzenia spotkania.",
    };
  }
}

/**
 * Usuwa spotkanie po id (tylko jeśli należy do zalogowanego organizatora).
 * @param {string} meetingId
 */
export async function deleteMeeting(meetingId) {
  try {
    const auth = await requireCreatorOrAdmin();
    if (!auth.ok) return { success: false, error: auth.error };

    if (!meetingId || typeof meetingId !== "string") {
      return { success: false, error: "Nieprawidłowe ID spotkania." };
    }

    const result = await prisma.meeting.deleteMany({
      where: {
        id: meetingId,
        ...(isAdminRole(auth.role) ? {} : { organizerId: auth.userId }),
      },
    });

    if (!result || result.count < 1) {
      return {
        success: false,
        error: "Nie znaleziono spotkania albo brak uprawnień do usunięcia.",
      };
    }

    revalidatePath("/dashboard/calendar");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    console.error("deleteMeeting:", error);
    return { success: false, error: "Wystąpił błąd podczas usuwania." };
  }
}
