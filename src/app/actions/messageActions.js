"use server";

import { prisma } from "@/lib/prisma";
import { transporter, mailOptions } from "@/lib/nodemailer";
import { revalidatePath } from "next/cache";
import { render } from "@react-email/render";
import React from "react";

import CrmWelcomeLead, {
  getSubject as getCrmWelcomeLeadSubject,
} from "@/emails/templates/CrmWelcomeLead";
import CalendarMeetingInvitation, {
  getSubject as getCalendarMeetingInvitationSubject,
} from "@/emails/templates/CalendarMeetingInvitation";
import CalendarMeetingReminder, {
  getSubject as getCalendarMeetingReminderSubject,
} from "@/emails/templates/CalendarMeetingReminder";
import CrmProposalSent, { getSubject as getCrmProposalSentSubject } from "@/emails/templates/CrmProposalSent";
import CourseEnrollmentConfirmation, {
  getSubject as getCourseEnrollmentConfirmationSubject,
} from "@/emails/templates/CourseEnrollmentConfirmation";
import CourseCertificateAwarded, {
  getSubject as getCourseCertificateAwardedSubject,
} from "@/emails/templates/CourseCertificateAwarded";
import DocSignatureRequest, {
  getSubject as getDocSignatureRequestSubject,
} from "@/emails/templates/DocSignatureRequest";
import AuthPasswordReset, { getSubject as getAuthPasswordResetSubject } from "@/emails/templates/AuthPasswordReset";

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

const TEMPLATE_REGISTRY = {
  CrmWelcomeLead: {
    Component: CrmWelcomeLead,
    getSubject: getCrmWelcomeLeadSubject,
  },
  CalendarMeetingInvitation: {
    Component: CalendarMeetingInvitation,
    getSubject: getCalendarMeetingInvitationSubject,
  },
  CalendarMeetingReminder: {
    Component: CalendarMeetingReminder,
    getSubject: getCalendarMeetingReminderSubject,
  },
  CrmProposalSent: {
    Component: CrmProposalSent,
    getSubject: getCrmProposalSentSubject,
  },
  CourseEnrollmentConfirmation: {
    Component: CourseEnrollmentConfirmation,
    getSubject: getCourseEnrollmentConfirmationSubject,
  },
  CourseCertificateAwarded: {
    Component: CourseCertificateAwarded,
    getSubject: getCourseCertificateAwardedSubject,
  },
  DocSignatureRequest: {
    Component: DocSignatureRequest,
    getSubject: getDocSignatureRequestSubject,
  },
  AuthPasswordReset: {
    Component: AuthPasswordReset,
    getSubject: getAuthPasswordResetSubject,
  },
};

/**
 * Wysyła mail na podstawie React Email template.
 * @param {string} leadId
 * @param {string} toEmail
 * @param {keyof typeof TEMPLATE_REGISTRY} templateName
 * @param {object} props
 */
export async function sendTemplatedEmail(leadId, toEmail, templateName, props) {
  try {
    if (!leadId || !toEmail || !templateName) {
      return { success: false, error: "Brakuje wymaganych danych do wysyłki." };
    }

    const entry = TEMPLATE_REGISTRY[templateName];
    if (!entry) {
      return { success: false, error: `Nieznany szablon: ${templateName}` };
    }

    const EmailComponent = entry.Component;
    const safeProps = props || {};
    const subject = entry.getSubject ? entry.getSubject(safeProps) : "Wiadomość z systemu CRM";

    const element = React.createElement(EmailComponent, safeProps);
    const html = await render(element);
    const text = await render(element, { plainText: true });

    await transporter.sendMail({
      from: mailOptions.from,
      to: toEmail,
      subject,
      text,
      html,
    });

    const savedMessage = await prisma.message.create({
      data: {
        leadId,
        subject,
        body: html,
        type: "EMAIL",
        direction: "OUTBOUND",
      },
    });

    revalidatePath(`/crm/lead/${leadId}`);
    return { success: true, data: savedMessage };
  } catch (error) {
    console.error("Błąd podczas wysyłki templated email:", error);
    const details =
      process.env.NODE_ENV !== "production"
        ? typeof error?.message === "string"
          ? error.message
          : String(error)
        : undefined;
    return {
      success: false,
      error: "Nie udało się wysłać wiadomości e-mail.",
      ...(details ? { details } : {}),
    };
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