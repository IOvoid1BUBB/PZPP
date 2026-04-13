"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const SLOT_MINUTES = 30;
const WORK_START_HOUR = 9;
const WORK_END_HOUR = 17;
const MAX_DAYS_AHEAD = 21;

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function splitName(fullName) {
  const safe = (fullName || "").trim().replace(/\s+/g, " ");
  if (!safe) return { firstName: "", lastName: null };
  const [firstName, ...rest] = safe.split(" ");
  return {
    firstName,
    lastName: rest.length ? rest.join(" ") : null,
  };
}

async function getDefaultOrganizerId() {
  const organizer = await prisma.user.findFirst({
    where: { role: { in: ["ADMIN", "KREATOR"] } },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  return organizer?.id || null;
}

export async function getPublicAvailableSlots(daysAhead = MAX_DAYS_AHEAD) {
  try {
    const organizerId = await getDefaultOrganizerId();
    if (!organizerId) {
      return { success: false, error: "Brak dostępnego organizatora." };
    }

    const now = new Date();
    const safeDaysAhead = Math.min(Math.max(Number(daysAhead) || MAX_DAYS_AHEAD, 1), 60);
    const rangeStart = now;
    const rangeEnd = addMinutes(startOfDay(addMinutes(now, safeDaysAhead * 24 * 60)), 24 * 60);

    const meetings = await prisma.meeting.findMany({
      where: {
        organizerId,
        startTime: { lt: rangeEnd },
        endTime: { gt: rangeStart },
      },
      select: {
        startTime: true,
        endTime: true,
      },
      orderBy: { startTime: "asc" },
    });

    const days = [];

    for (let dayOffset = 0; dayOffset < safeDaysAhead; dayOffset += 1) {
      const day = addMinutes(startOfDay(now), dayOffset * 24 * 60);
      const weekday = day.getDay();
      if (weekday === 0 || weekday === 6) continue;

      const slots = [];

      for (
        let hour = WORK_START_HOUR;
        hour < WORK_END_HOUR;
        hour += SLOT_MINUTES / 60
      ) {
        const h = Math.floor(hour);
        const m = (hour - h) * 60;
        const start = new Date(
          day.getFullYear(),
          day.getMonth(),
          day.getDate(),
          h,
          m,
          0,
          0
        );
        const end = addMinutes(start, SLOT_MINUTES);

        if (start <= now) continue;

        const overlap = meetings.some(
          (meeting) => meeting.startTime < end && meeting.endTime > start
        );
        if (!overlap) {
          slots.push(start.toISOString());
        }
      }

      if (slots.length) {
        days.push({
          date: day.toISOString(),
          slots,
        });
      }
    }

    return { success: true, days };
  } catch (error) {
    console.error("getPublicAvailableSlots:", error);
    return { success: false, error: "Nie udało się pobrać dostępnych terminów." };
  }
}

export async function bookPublicMeeting(data) {
  try {
    const name = (data?.name || "").trim();
    const email = (data?.email || "").trim().toLowerCase();
    const phone = (data?.phone || "").trim();
    const slotStartRaw = data?.slotStart;

    if (!name || name.length < 2) {
      return { success: false, error: "Podaj imię i nazwisko." };
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { success: false, error: "Podaj poprawny adres e-mail." };
    }
    if (!slotStartRaw) {
      return { success: false, error: "Wybierz termin rozmowy." };
    }

    const organizerId = await getDefaultOrganizerId();
    if (!organizerId) {
      return { success: false, error: "Brak dostępnego organizatora." };
    }

    const slotStart = new Date(slotStartRaw);
    if (Number.isNaN(slotStart.getTime())) {
      return { success: false, error: "Nieprawidłowy termin." };
    }

    const now = new Date();
    const latest = addMinutes(now, 60 * 24 * 60);
    if (slotStart <= now || slotStart > latest) {
      return { success: false, error: "Ten termin jest poza dostępnym zakresem." };
    }

    const slotEnd = addMinutes(slotStart, SLOT_MINUTES);
    const { firstName, lastName } = splitName(name);
    if (!firstName) {
      return { success: false, error: "Podaj poprawne imię." };
    }

    const booking = await prisma.$transaction(async (tx) => {
      const conflict = await tx.meeting.findFirst({
        where: {
          organizerId,
          startTime: { lt: slotEnd },
          endTime: { gt: slotStart },
        },
        select: { id: true },
      });

      if (conflict) {
        return { ok: false, error: "Wybrany termin został już zarezerwowany." };
      }

      const existingLead = await tx.lead.findFirst({
        where: { ownerId: organizerId, email },
        select: { id: true, ownerId: true },
      });

      const lead = existingLead
        ? await tx.lead.update({
            where: { id: existingLead.id },
            data: {
              firstName,
              lastName,
              phone: phone || null,
              source: "booking-widget",
              ...(existingLead.ownerId ? {} : { ownerId: organizerId }),
            },
            select: { id: true },
          })
        : await tx.lead.create({
            data: {
              firstName,
              lastName,
              email,
              phone: phone || null,
              source: "booking-widget",
              ownerId: organizerId,
            },
            select: { id: true },
          });

      const meeting = await tx.meeting.create({
        data: {
          title: `Rozmowa: ${name}`,
          startTime: slotStart,
          endTime: slotEnd,
          organizerId,
          leadId: lead.id,
        },
        select: { id: true, startTime: true },
      });

      return { ok: true, meeting };
    });

    if (!booking.ok) {
      return { success: false, error: booking.error };
    }

    revalidatePath("/dashboard/calendar");
    revalidatePath("/");
    revalidatePath("/rezerwacja");

    return {
      success: true,
      meetingId: booking.meeting.id,
      startTime: booking.meeting.startTime.toISOString(),
    };
  } catch (error) {
    console.error("bookPublicMeeting:", error);
    return { success: false, error: "Nie udało się zapisać rezerwacji." };
  }
}
