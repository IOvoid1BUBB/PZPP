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

