import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    const lead = await prisma.lead.findUnique({
      where: { email: String(sender).trim() },
    });

    if (!lead) {
      return NextResponse.json({ success: true, ignored: true }, { status: 200 });
    }

    await prisma.message.create({
      data: {
        leadId: lead.id,
        subject: String(subject),
        body: String(text),
        type: "EMAIL",
        direction: "INBOUND",
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e) {
    console.error("webhooks/email:", e);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
