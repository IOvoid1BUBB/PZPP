import Stripe from "stripe";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

function getStripe() {
  if (!stripeSecretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY env var");
  }
  return new Stripe(stripeSecretKey, { apiVersion: "2026-03-25.dahlia" });
}

async function createCheckoutUrl(courseId: string, origin: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, title: true, price: true },
  });

  if (!course) {
    return { ok: false as const, error: "Nie znaleziono kursu." };
  }

  if (!course.price || course.price <= 0) {
    return {
      ok: false as const,
      error: "Kurs nie ma ustawionej ceny. Ustaw cenę kursu przed sprzedażą.",
    };
  }

  const stripe = getStripe();
  const unitAmount = Math.round(course.price * 100);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "pln",
          product_data: { name: course.title },
          unit_amount: unitAmount,
        },
        quantity: 1,
      },
    ],
    success_url: `${origin}/?stripe=success`,
    cancel_url: `${origin}/?stripe=cancel`,
    metadata: {
      courseId: course.id,
    },
  });

  if (!session.url) {
    return { ok: false as const, error: "Nie udało się utworzyć sesji Stripe." };
  }

  return { ok: true as const, url: session.url };
}

export async function GET(req: Request) {
  try {
    const { searchParams, origin } = new URL(req.url);
    const courseId = searchParams.get("courseId");
    if (!courseId) {
      return NextResponse.json({ error: "courseId jest wymagane." }, { status: 400 });
    }

    const result = await createCheckoutUrl(courseId, origin);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.redirect(result.url, { status: 303 });
  } catch (error) {
    console.error("stripe checkout GET:", error);
    return NextResponse.json({ error: "Błąd tworzenia płatności." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const origin = req.headers.get("origin") || "http://localhost:3000";
    const body = await req.json().catch(() => null);
    const courseId = body?.courseId;
    if (!courseId || typeof courseId !== "string") {
      return NextResponse.json({ error: "courseId jest wymagane." }, { status: 400 });
    }

    const result = await createCheckoutUrl(courseId, origin);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ url: result.url });
  } catch (error) {
    console.error("stripe checkout POST:", error);
    return NextResponse.json({ error: "Błąd tworzenia płatności." }, { status: 500 });
  }
}

