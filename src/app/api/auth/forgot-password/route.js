import { NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import React from "react";
import { render } from "@react-email/render";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/schemas/authSchemas";
import { transporter, mailOptions } from "@/lib/nodemailer";
import AuthPasswordReset, { getSubject as getAuthPasswordResetSubject } from "@/emails/templates/AuthPasswordReset";

const FALLBACK_SUCCESS_MESSAGE =
  "Jeśli konto z tym adresem istnieje, wysłaliśmy link do resetu hasła.";
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 godzina

function resolveAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
}

export async function POST(request) {
  try {
    const body = await request.json();
    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      const emailError = parsed.error.flatten().fieldErrors.email?.[0];
      return NextResponse.json(
        { success: false, error: emailError || "Nieprawidłowe dane formularza." },
        { status: 400 }
      );
    }

    const email = parsed.data.email.toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true },
    });

    if (!user?.email) {
      return NextResponse.json({ success: true, message: FALLBACK_SUCCESS_MESSAGE });
    }

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    const identifier = `password-reset:${user.id}`;

    // Reuse existing NextAuth verification tokens table so flow works
    // even when dedicated PasswordResetToken migration is not applied yet.
    await prisma.verificationToken.deleteMany({
      where: { identifier },
    });

    await prisma.verificationToken.create({
      data: {
        identifier,
        token: tokenHash,
        expires: expiresAt,
      },
    });

    const resetUrl = `${resolveAppUrl()}/reset-password?token=${encodeURIComponent(rawToken)}`;
    const props = {
      userName: user.name,
      email: user.email,
      resetUrl,
    };

    const element = React.createElement(AuthPasswordReset, props);
    const html = await render(element);
    const text = await render(element, { plainText: true });

    await transporter.sendMail({
      from: mailOptions.from,
      to: user.email,
      subject: getAuthPasswordResetSubject({ email: user.email }),
      text,
      html,
    });

    return NextResponse.json({ success: true, message: FALLBACK_SUCCESS_MESSAGE });
  } catch (error) {
    console.error("forgot-password:", error);
    return NextResponse.json(
      { success: false, error: "Nie udało się obsłużyć resetu hasła." },
      { status: 500 }
    );
  }
}
