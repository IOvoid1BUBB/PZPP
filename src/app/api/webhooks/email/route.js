import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNotification, NOTIFICATION_TYPES } from "@/lib/notifications";

export async function POST(request) {
  try {
    const expected = process.env.EMAIL_WEBHOOK_SECRET;
    if (expected) {
      const provided = request.headers.get("x-webhook-secret");
      if (!provided || provided !== expected) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
      }
    }

    const payload = await request.json();

    // TODO: W przyszłości zaktualizować mapowanie pól pod specyficzny payload dostawcy
    const sender = payload.sender || payload.from;
    const text = payload.text || payload.body;
    const subject = payload.subject || "Odpowiedź";

    if (!sender || text == null || text === "") {
      return NextResponse.json(
        { success: false, error: "Brak wymaganych pól (sender, text/body)." },
        { status: 400 }
      );
    }

    const email = String(sender).trim().toLowerCase();
    const hintedOwnerId =
      (typeof payload?.ownerId === "string" && payload.ownerId.trim()) ||
      (request.headers.get("x-owner-id") || "").trim() ||
      null;

    const lead = hintedOwnerId
      ? await prisma.lead.findFirst({
          where: { ownerId: hintedOwnerId, email },
          select: { id: true, ownerId: true },
        })
      : null;

    let resolvedLead = lead;
    if (!resolvedLead) {
      const candidates = await prisma.lead.findMany({
        where: { email },
        select: { id: true, ownerId: true },
        take: 2,
      });
      if (candidates.length === 1) {
        resolvedLead = { id: candidates[0].id, ownerId: candidates[0].ownerId };
      } else if (candidates.length > 1) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Ambiguous lead email. Provide ownerId in payload or x-owner-id header.",
          },
          { status: 409 }
        );
      }
    }

    if (!resolvedLead) {
      return NextResponse.json({ success: true, ignored: true }, { status: 200 });
    }

    const message = await prisma.message.create({
      data: {
        leadId: resolvedLead.id,
        subject: String(subject),
        body: String(text),
        type: "EMAIL",
        direction: "INBOUND",
      },
    });

    if (resolvedLead.ownerId) {
      await createNotification({
        userId: resolvedLead.ownerId,
        type: NOTIFICATION_TYPES.MESSAGE_RECEIVED,
        title: "Nowa wiadomość",
        body: String(subject),
        url: `/dashboard/skrzynka?leadId=${encodeURIComponent(resolvedLead.id)}`,
        entityId: message.id,
      }).catch(() => null);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e) {
    console.error("webhooks/email:", e);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
