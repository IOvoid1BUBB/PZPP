import { NextResponse } from "next/server";
import { createHash } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { resetPasswordSchema } from "@/lib/schemas/authSchemas";

export async function POST(request) {
  try {
    const body = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      return NextResponse.json(
        {
          success: false,
          fieldErrors: {
            token: errors.token?.[0] ?? null,
            password: errors.password?.[0] ?? null,
            confirmPassword: errors.confirmPassword?.[0] ?? null,
          },
          error: "Nieprawidłowe dane formularza.",
        },
        { status: 400 }
      );
    }

    const now = new Date();
    const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");

    const tokenRecord = await prisma.verificationToken.findUnique({
      where: { token: tokenHash },
      select: { identifier: true, token: true, expires: true },
    });

    const isPasswordResetToken =
      typeof tokenRecord?.identifier === "string" &&
      tokenRecord.identifier.startsWith("password-reset:");
    const userId = isPasswordResetToken
      ? tokenRecord.identifier.replace("password-reset:", "")
      : null;

    if (!tokenRecord || !isPasswordResetToken || !userId || tokenRecord.expires < now) {
      return NextResponse.json(
        {
          success: false,
          error: "Link do resetu hasła jest nieprawidłowy lub wygasł.",
        },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(parsed.data.password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      }),
      prisma.verificationToken.deleteMany({
        where: { identifier: `password-reset:${userId}` },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Hasło zostało pomyślnie zmienione.",
    });
  } catch (error) {
    console.error("reset-password:", error);
    return NextResponse.json(
      { success: false, error: "Nie udało się zresetować hasła." },
      { status: 500 }
    );
  }
}
