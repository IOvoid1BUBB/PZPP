import Stripe from "stripe";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { provisionPaidCheckout } from "@/lib/stripe/provisioning";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const platformUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

function getStripe() {
  if (!stripeSecretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY env var");
  }
  return new Stripe(stripeSecretKey, { apiVersion: "2026-03-25.dahlia" });
}

export async function POST(req: Request) {
  try {
    if (!webhookSecret) {
      console.error("stripe webhook: missing STRIPE_WEBHOOK_SECRET");
      return NextResponse.json({ error: "Webhook nie jest skonfigurowany." }, { status: 500 });
    }

    const stripe = getStripe();
    const sig = (await headers()).get("stripe-signature");
    if (!sig) {
      return NextResponse.json({ error: "Brak nagłówka stripe-signature." }, { status: 400 });
    }

    const rawBody = await req.text();
    const event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);

    console.log("stripe webhook received:", event.type);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const stripeSessionId = session.id;
      const courseId = session.metadata?.courseId ?? null;
      const metadataUserId = session.metadata?.userId ?? null;
      const customerEmail =
        session.customer_details?.email ||
        (typeof session.customer_email === "string" ? session.customer_email : null) ||
        null;
      const customerName = session.customer_details?.name || null;

      console.log("checkout.session.completed", {
        stripeSessionId,
        courseId,
        metadataUserId,
        customerEmail,
        customerName,
        paymentStatus: session.payment_status,
        amountTotal: session.amount_total,
        currency: session.currency,
      });

      if (!courseId) {
        console.warn("stripe webhook: missing courseId in session.metadata", { stripeSessionId });
        return NextResponse.json({ received: true });
      }

      // Demo onboarding: we must have the email entered in Stripe Checkout.
      if (!customerEmail) {
        console.warn("stripe webhook: missing customerEmail in Stripe session", {
          stripeSessionId,
          courseId,
          metadataUserId,
        });
        return NextResponse.json({ received: true });
      }

      const provisioning = await provisionPaidCheckout({
        stripeSessionId,
        courseId,
        customerEmail,
        customerName,
        amountTotal: session.amount_total,
        platformUrl,
      });

      console.log("stripe webhook: provisioning done", {
        stripeSessionId,
        userCreated: provisioning.userCreated,
        enrollmentCreated: provisioning.enrollmentCreated,
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("stripe webhook error:", error);
    return NextResponse.json({ error: "Webhook error" }, { status: 400 });
  }
}

