"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { addLeadActivity } from "@/app/actions/scoringActions";
import { requireCreatorOrAdmin, isAdminRole } from "@/lib/rbac";

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

    const start = toDate(startDate, "startDate");
    const end = toDate(endDate, "endDate");

    if (end <= start) return [];

    const meetings = await prisma.meeting.findMany({
      where: {
        startTime: { lt: end },
        endTime: { gt: start },
        ...(isAdminRole(auth.role) ? {} : { organizerId: auth.userId }),
      },
      orderBy: { startTime: "asc" },
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

    return meetings.map((m) => ({
      id: m.id,
      title: m.title,
      startTime: m.startTime.toISOString(),
      endTime: m.endTime.toISOString(),
      meetLink: m.meetLink,
      organizerId: m.organizerId,
      leadId: m.leadId,
    }));
  } catch (error) {
    console.error("getMeetings:", error);
    return [];
  }
}

function isTokenExpired(expiresAt) {
  if (!expiresAt) return false;
  const nowInSeconds = Math.floor(Date.now() / 1000);
  return expiresAt <= nowInSeconds;
}

function toIsoDateOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
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
  };
}

async function fetchGoogleCalendarEvents(account, rangeStart, rangeEnd) {
  try {
    if (!account?.access_token) return [];
    if (isTokenExpired(account.expires_at)) {
      // TODO: Dodać refresh token rotation i ponowienie requestu do Google API.
      throw new Error("Google token wygasł.");
    }

    const params = new URLSearchParams({
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "200",
      timeMin: rangeStart.toISOString(),
      timeMax: rangeEnd.toISOString(),
    });

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${account.access_token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    if (response.status === 401) {
      // TODO: Dodać flow odświeżania tokenu dla Google.
      throw new Error("Google API 401.");
    }

    if (!response.ok) {
      throw new Error(`Google API error: ${response.status}`);
    }

    const data = await response.json();
    const items = Array.isArray(data?.items) ? data.items : [];

    return items
      .map((event) =>
        toUnifiedEvent({
          id: `google-${event.id}`,
          title: event.summary,
          start: event?.start?.dateTime || event?.start?.date,
          end: event?.end?.dateTime || event?.end?.date,
          source: "google",
          externalUrl: event?.htmlLink || null,
        })
      )
      .filter(Boolean);
  } catch (error) {
    console.error("fetchGoogleCalendarEvents:", error);
    throw error;
  }
}

async function fetchOutlookCalendarEvents(account, rangeStart, rangeEnd) {
  try {
    if (!account?.access_token) return [];
    if (isTokenExpired(account.expires_at)) {
      // TODO: Dodać refresh token rotation i ponowienie requestu do Microsoft Graph.
      throw new Error("Outlook token wygasł.");
    }

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

    if (response.status === 401) {
      // TODO: Dodać flow odświeżania tokenu dla Outlook/Graph.
      throw new Error("Microsoft Graph API 401.");
    }

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
export async function getUnifiedCalendarEvents(userId, startDate, endDate) {
  try {
    const start = toDate(startDate, "startDate");
    const end = toDate(endDate, "endDate");
    if (end <= start) return [];

    let resolvedUserId = userId;
    if (!resolvedUserId) {
      const session = await getServerSession(authOptions);
      resolvedUserId = session?.user?.id;
    }

    const [localMeetings, accounts] = await Promise.all([
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
        ? prisma.account.findMany({
            where: {
              userId: resolvedUserId,
              provider: { in: ["google", "azure-ad"] },
            },
            select: {
              provider: true,
              access_token: true,
              refresh_token: true,
              expires_at: true,
            },
          })
        : Promise.resolve([]),
    ]);

    const googleAccount = accounts.find((account) => account.provider === "google");
    const outlookAccount = accounts.find((account) => account.provider === "azure-ad");

    const externalResults = await Promise.allSettled([
      googleAccount ? fetchGoogleCalendarEvents(googleAccount, start, end) : [],
      outlookAccount ? fetchOutlookCalendarEvents(outlookAccount, start, end) : [],
    ]);

    const externalEvents = externalResults
      .flatMap((result) => {
        if (result.status === "fulfilled") return result.value || [];
        console.error("getUnifiedCalendarEvents external provider error:", result.reason);
        return [];
      })
      .filter(Boolean);

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

    if (!title) return { success: false, error: "Tytuł spotkania jest wymagany." };

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
        : meetLinkRaw ?? null;

    // TODO: Dla synchronizacji 2-way po utworzeniu lokalnego spotkania
    // należy wykonać mutację do Google/Outlook i zapisać external event id.
    const meeting = await prisma.meeting.create({
      data: {
        title,
        startTime,
        endTime,
        meetLink,
        organizerId,
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

    if (meeting.leadId) {
      // Importuj addLeadActivity na górze pliku meetingActions.js
      await addLeadActivity(meeting.leadId, 'MEETING_SCHEDULED');
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
        error: "Ten termin jest już zajęty! Ktoś inny zdążył zarezerwować tę samą godzinę.",
      };
    }

    // Standardowe łapanie pozostałych błędów
    console.error("createMeeting:", error);
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
        error:
          "Nie znaleziono spotkania albo brak uprawnień do usunięcia.",
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

