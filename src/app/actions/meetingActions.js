"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

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
    const start = toDate(startDate, "startDate");
    const end = toDate(endDate, "endDate");

    if (end <= start) return [];

    const meetings = await prisma.meeting.findMany({
      where: {
        startTime: { lt: end },
        endTime: { gt: start },
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
    const title = typeof data?.title === "string" ? data.title.trim() : "";
    const meetLinkRaw = data?.meetLink;

    if (!title) return { success: false, error: "Tytuł spotkania jest wymagany." };

    const session = await getServerSession(authOptions);
    const organizerId = session?.user?.id;
    if (!organizerId) {
      return { success: false, error: "Brak dostępu. Zaloguj się ponownie." };
    }

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
    if (!meetingId || typeof meetingId !== "string") {
      return { success: false, error: "Nieprawidłowe ID spotkania." };
    }

    const session = await getServerSession(authOptions);
    const organizerId = session?.user?.id;
    if (!organizerId) {
      return { success: false, error: "Brak dostępu. Zaloguj się ponownie." };
    }

    const result = await prisma.meeting.deleteMany({
      where: {
        id: meetingId,
        organizerId,
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

