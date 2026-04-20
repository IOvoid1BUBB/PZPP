"use server";

import { prisma } from "@/lib/prisma";
import { sendEmailToLead } from "@/app/actions/messageActions";

const REMINDER_WINDOWS = [
  { type: "24H", msBefore: 24 * 60 * 60 * 1000 },
  { type: "1H", msBefore: 60 * 60 * 1000 },
];

export async function processUpcomingMeetings() {
  try {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const meetings = await prisma.meeting.findMany({
      where: {
        startTime: {
          gte: now,
          lte: in24h,
        },
        leadId: { not: null },
      },
      select: {
        id: true,
        title: true,
        startTime: true,
        leadId: true,
        lead: {
          select: {
            email: true,
            firstName: true,
          },
        },
      },
      orderBy: { startTime: "asc" },
    });

    const sent = await prisma.meetingReminder.findMany({
      where: {
        meetingId: { in: meetings.map((m) => m.id) },
      },
      select: { meetingId: true, type: true },
    });

    const sentSet = new Set(sent.map((item) => `${item.meetingId}:${item.type}`));
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    let createdReminders = 0;
    let sentEmails = 0;

    for (const meeting of meetings) {
      if (!meeting.lead?.email || !meeting.leadId) continue;

      const diffMs = new Date(meeting.startTime).getTime() - now.getTime();
      if (diffMs <= 0) continue;

      for (const rule of REMINDER_WINDOWS) {
        if (diffMs > rule.msBefore) continue;

        const key = `${meeting.id}:${rule.type}`;
        if (sentSet.has(key)) continue;

        const reminderLabel = rule.type === "24H" ? "za około 24 godziny" : "za około 1 godzinę";
        const subject = `Przypomnienie o spotkaniu: ${meeting.title}`;
        const body = [
          `Cześć ${meeting.lead.firstName || ""},`,
          "",
          `To przypomnienie, że spotkanie "${meeting.title}" odbędzie się ${reminderLabel}.`,
          `Termin: ${new Date(meeting.startTime).toLocaleString("pl-PL")}`,
          "",
          `Jeśli potrzebujesz zmienić termin, skorzystaj z linku: ${appUrl}/reschedule/${meeting.id}`,
          "",
          "Pozdrawiamy,",
          "Zespół CRM",
        ].join("\n");

        const sendResult = await sendEmailToLead(meeting.leadId, meeting.lead.email, subject, body);
        if (!sendResult?.success) {
          console.error("processUpcomingMeetings sendEmailToLead:", sendResult?.error);
          continue;
        }

        await prisma.meetingReminder.create({
          data: {
            meetingId: meeting.id,
            type: rule.type,
          },
        });

        sentSet.add(key);
        sentEmails += 1;
        createdReminders += 1;
      }
    }

    return {
      success: true,
      processedMeetings: meetings.length,
      sentEmails,
      createdReminders,
    };
  } catch (error) {
    console.error("processUpcomingMeetings:", error);
    return { success: false, error: "Nie udało się przetworzyć przypomnień spotkań." };
  }
}
