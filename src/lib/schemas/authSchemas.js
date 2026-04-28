import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Adres e-mail jest wymagany.")
    .email("Podaj poprawny adres e-mail."),
  password: z
    .string()
    .min(1, "Hasło jest wymagane.")
    .min(8, "Hasło musi mieć co najmniej 8 znaków."),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Adres e-mail jest wymagany.")
    .email("Podaj poprawny adres e-mail."),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(1, "Brakuje tokenu resetu hasła."),
    password: z
      .string()
      .min(1, "Nowe hasło jest wymagane.")
      .min(8, "Hasło musi mieć co najmniej 8 znaków."),
    confirmPassword: z.string().min(1, "Potwierdzenie hasła jest wymagane."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Podane hasła muszą być identyczne.",
  });

