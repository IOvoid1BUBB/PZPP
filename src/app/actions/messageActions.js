"use server";

import { prisma } from "@/lib/prisma";
import { transporter, mailOptions } from "@/lib/nodemailer";
import { revalidatePath } from "next/cache";

/**
 * Wysyła prawdziwego maila przez Nodemailer i zapisuje go w historii leada.
 */
export async function sendEmailToLead(leadId, toEmail, subject, body) {
  try {
    if (!leadId || !toEmail || !body) {
      return { success: false, error: "Brakuje wymaganych danych do wysyłki." };
    }

    // 1. Fizyczna wysyłka maila przez Nodemailer
    await transporter.sendMail({
      from: mailOptions.from,
      to: toEmail,
      subject: subject || "Wiadomość z systemu CRM",
      text: body,
      // html: `<p>${body}</p>` // Jeśli wolisz wysyłać HTML, odkomentuj to
    });

    // 2. Zapis w bazie danych (tabela Message)
    const savedMessage = await prisma.message.create({
      data: {
        leadId,
        subject,
        body,
        type: "EMAIL",
        direction: "OUTBOUND",
      },
    });

    // 3. Odświeżenie widoku profilu leada
    revalidatePath(`/crm/lead/${leadId}`);
    return { success: true, data: savedMessage };

  } catch (error) {
    console.error("Błąd podczas wysyłki maila:", error);
    return { success: false, error: "Nie udało się wysłać wiadomości e-mail." };
  }
}

/**
 * Symuluje wysyłkę SMS (nie wysyła fizycznie, tylko tworzy wpis w historii).
 */
export async function simulateSMSToLead(leadId, phone, body) {
  try {
    if (!leadId || !body) {
      return { success: false, error: "Brakuje wymaganych danych dla SMS." };
    }

    // Tu w przyszłości można podpiąć bramkę SMS (np. Twilio, SMSAPI).
    // Na ten moment zadanie wymaga tylko "symulacji", więc od razu zapisujemy do bazy.

    const savedSMS = await prisma.message.create({
      data: {
        leadId,
        subject: "Wiadomość SMS", // Opcjonalnie, SMSy rzadko mają temat
        body,
        type: "SMS",
        direction: "OUTBOUND",
      },
    });

    revalidatePath(`/crm/lead/${leadId}`);
    return { success: true, data: savedSMS };

  } catch (error) {
    console.error("Błąd podczas symulacji SMS:", error);
    return { success: false, error: "Nie udało się zapisać wiadomości SMS." };
  }
}