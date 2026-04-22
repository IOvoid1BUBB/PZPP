"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/schemas/authSchemas";

export async function validateLoginAction(_prevState, formData) {
  const rawValues = {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  };

  const parsed = loginSchema.safeParse(rawValues);
  if (!parsed.success) {
    const { fieldErrors } = parsed.error.flatten();
    return {
      success: false,
      fieldErrors: {
        email: fieldErrors.email?.[0] ?? null,
        password: fieldErrors.password?.[0] ?? null,
      },
      formError: null,
      values: rawValues,
    };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, password: true },
  });

  if (!user?.password) {
    return {
      success: false,
      fieldErrors: {},
      formError: "Nieprawidłowy email lub hasło.",
      values: rawValues,
    };
  }

  const isValidPassword = await bcrypt.compare(parsed.data.password, user.password);
  if (!isValidPassword) {
    return {
      success: false,
      fieldErrors: {},
      formError: "Nieprawidłowy email lub hasło.",
      values: rawValues,
    };
  }

  return {
    success: true,
    fieldErrors: {},
    formError: null,
    values: parsed.data,
  };
}

