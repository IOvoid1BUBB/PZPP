"use server";

import { prisma } from "@/lib/prisma";

/**
 * Placeholder pod Google/Graph FreeBusy.
 * Docelowo funkcja powinna agregować zajętość z wielu providerów.
 */
export async function checkExternalFreeBusy(startTime, endTime) {
  try {
    // TODO: 1) Zweryfikuj tokeny OAuth usera (Google + Microsoft Graph).
    // TODO: 2) Uderz w endpointy freebusy/calendarView dla przekazanego zakresu.
    // TODO: 3) Znormalizuj odpowiedzi do wspólnego formatu i zwróć konflikty.
    return {
      success: true,
      busySlots: [],
      window: { startTime, endTime },
      message: "Szkielet FreeBusy gotowy do integracji providerów.",
    };
  } catch (error) {
    console.error("checkExternalFreeBusy:", error);
    return { success: false, error: "Nie udało się sprawdzić zajętości kalendarzy zewnętrznych." };
  }
}

/**
 * Placeholder pod synchronizację 2-way lokalnego meetingu do Google/Outlook.
 */
export async function syncMeetingToExternal(meetingId) {
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
        endTime: true,
        organizerId: true,
        googleEventId: true,
        outlookEventId: true,
      },
    });

    if (!meeting) {
      return { success: false, error: "Spotkanie nie istnieje." };
    }

    // TODO: 1) Pobierz tokeny OAuth organizatora.
    // TODO: 2) Jeśli googleEventId/outlookEventId istnieje -> update event; w przeciwnym razie create.
    // TODO: 3) Zapisz otrzymane external id (googleEventId / outlookEventId) w tabeli Meeting.
    // TODO: 4) Obsłuż retry oraz status błędów providerów.

    return {
      success: true,
      meetingId: meeting.id,
      message: "Szkielet synchronizacji spotkania przygotowany.",
    };
  } catch (error) {
    console.error("syncMeetingToExternal:", error);
    return { success: false, error: "Nie udało się zsynchronizować spotkania z kalendarzem zewnętrznym." };
  }
}
