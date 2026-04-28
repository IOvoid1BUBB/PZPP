import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNotification, NOTIFICATION_TYPES } from "@/lib/notifications";

function extractEmailAddress(input) {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  const bracketMatch = trimmed.match(/<([^<>]+)>/);
  const rawEmail = (bracketMatch?.[1] || trimmed).trim().toLowerCase();
  return rawEmail.includes("@") ? rawEmail : null;
}

function firstAddress(value) {
  if (Array.isArray(value)) {
    for (const item of value) {
      const parsed = extractEmailAddress(item);
      if (parsed) return parsed;
    }
    return null;
  }
  return extractEmailAddress(value);
}

export async function POST(request) {
  try {
    const expectedToken = process.env.WEBHOOK_SECRET || process.env.EMAIL_WEBHOOK_SECRET;
    const providedToken =
      request.headers.get("x-webhook-token") || request.headers.get("x-webhook-secret");
    if (!expectedToken || !providedToken || providedToken !== expectedToken) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const payload = await request.json();
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return NextResponse.json(
        { success: false, error: "Invalid payload. Expected JSON object." },
        { status: 400 }
      );
    }

    const from = firstAddress(payload.from || payload.sender);
    const to = firstAddress(payload.to);
    const subject = typeof payload.subject === "string" ? payload.subject.trim() : "";
    const text = typeof payload.text === "string" ? payload.text : "";
    const html = typeof payload.html === "string" ? payload.html : "";
    const body = text || html;

    if (!from || !to || !subject || !body) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: from, to, subject and text or html." },
        { status: 400 }
      );
    }

    const hintedOwnerId =
      (typeof payload.ownerId === "string" && payload.ownerId.trim()) ||
      (request.headers.get("x-owner-id") || "").trim() ||
      null;

    let owner = null;
    if (hintedOwnerId) {
      owner = await prisma.user.findUnique({
        where: { id: hintedOwnerId },
        select: { id: true, email: true },
      });
      if (!owner) {
        return NextResponse.json({ success: false, error: "Owner not found." }, { status: 404 });
      }
      if (!owner.email || owner.email.toLowerCase() !== to) {
        return NextResponse.json(
          { success: false, error: "Recipient email does not match owner." },
          { status: 403 }
        );
      }
    } else {
      owner = await prisma.user.findUnique({
        where: { email: to },
        select: { id: true, email: true },
      });
      if (!owner) {
        return NextResponse.json(
          { success: false, error: "Owner not found for recipient email." },
          { status: 404 }
        );
      }
    }

    const lead = await prisma.lead.findFirst({
      where: { ownerId: owner.id, email: from },
      select: { id: true, ownerId: true },
    });

    if (!lead) {
      return NextResponse.json(
        { success: false, error: "Lead not found for this owner and sender email." },
        { status: 404 }
      );
    }

    const message = await prisma.message.create({
      data: {
        leadId: lead.id,
        subject,
        body,
        type: "EMAIL",
        direction: "INBOUND",
        messageType: "EMAIL",
        assignedToId: owner.id,
      },
    });

    if (lead.ownerId) {
      await createNotification({
        userId: lead.ownerId,
        type: NOTIFICATION_TYPES.MESSAGE_RECEIVED,
        title: "Nowa wiadomość",
        body: subject,
        url: `/dashboard/skrzynka?leadId=${encodeURIComponent(lead.id)}`,
        entityId: message.id,
      }).catch(() => null);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e) {
    console.error("webhooks/email:", e);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
