"use server";

import { prisma } from "@/lib/prisma";
import { transporter, mailOptions } from "@/lib/nodemailer";
import { revalidatePath } from "next/cache";
import { render } from "@react-email/render";
import React from "react";
import { canAccessLead, requireCreatorOrAdmin, isAdminRole } from "@/lib/rbac";
import { addLeadActivity } from "@/app/actions/scoringActions";
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
import CrmCustomMessage, {
  getSubject as getCrmCustomMessageSubject,
} from "@/emails/templates/CrmCustomMessage";

/**
 * Pobiera leada i wiadomości (rosnąco po dacie utworzenia).
 * @param {string} leadId
 */
export async function getLeadMessages(leadId) {
  try {
    if (!leadId || typeof leadId !== "string") {
      return null;
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    const access = await canAccessLead(lead);
    if (!access.ok) return null;

    return lead;
  } catch (error) {
    console.error("getLeadMessages:", error);
    return null;
  }
}

function normalizeThreadKey(message) {
  if (message?.threadId && typeof message.threadId === "string") return message.threadId;
  return message?.leadId || "unknown-thread";
}

/**
 * Pobiera wiadomości pogrupowane po threadId (lub fallbackowo po leadId).
 */
export async function getThreadedMessages() {
  try {
    const auth = await requireCreatorOrAdmin();
    if (!auth.ok) return [];

    const messages = await prisma.message.findMany({
      where: {
        ...(isAdminRole(auth.role) ? {} : { lead: { ownerId: auth.userId } }),
      },
      orderBy: { createdAt: "asc" },
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    const grouped = new Map();
    for (const msg of messages) {
      const key = normalizeThreadKey(msg);
      if (!grouped.has(key)) {
        grouped.set(key, {
          threadId: key,
          leadId: msg.leadId,
          lead: msg.lead,
          status: msg.status || "OPEN",
          assignedTo: msg.assignedTo || null,
          lastMessageAt: msg.createdAt,
          messages: [],
        });
      }

      const thread = grouped.get(key);
      thread.messages.push(msg);
      thread.lastMessageAt = msg.createdAt;
      if (!thread.assignedTo && msg.assignedTo) {
        thread.assignedTo = msg.assignedTo;
      }
      if ((msg.status || "OPEN") !== "OPEN") {
        thread.status = msg.status || "OPEN";
      }
    }

    const threadIds = Array.from(grouped.keys());
    const comments = await prisma.internalComment.findMany({
      where: { threadId: { in: threadIds } },
      orderBy: { createdAt: "asc" },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    for (const comment of comments) {
      const thread = grouped.get(comment.threadId);
      if (!thread) continue;
      if (!thread.internalComments) thread.internalComments = [];
      thread.internalComments.push(comment);
    }

    return Array.from(grouped.values()).sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );
  } catch (error) {
    console.error("getThreadedMessages:", error);
    return [];
  }
}

/**
 * Przypisuje ownera do całego wątku.
 */
export async function assignThread(threadId, userId) {
  try {
    const auth = await requireCreatorOrAdmin();
    if (!auth.ok) return { success: false, error: auth.error };

    if (!threadId || typeof threadId !== "string") {
      return { success: false, error: "Nieprawidłowe ID wątku." };
    }

    const assigneeId = typeof userId === "string" && userId.trim() ? userId : null;
    if (assigneeId) {
      const userExists = await prisma.user.findUnique({
        where: { id: assigneeId },
        select: { id: true },
      });
      if (!userExists) return { success: false, error: "Wybrany użytkownik nie istnieje." };
    }

    const updateResult = await prisma.message.updateMany({
      where: {
        OR: [{ threadId }, { threadId: null, leadId: threadId }],
        ...(isAdminRole(auth.role) ? {} : { lead: { ownerId: auth.userId } }),
      },
      data: {
        assignedToId: assigneeId,
      },
    });

    revalidatePath("/dashboard/skrzynka");
    revalidatePath("/student/skrzynka");

    return {
      success: true,
      updated: updateResult.count,
    };
  } catch (error) {
    console.error("assignThread:", error);
    return { success: false, error: "Nie udało się przypisać ownera do wątku." };
  }
}

/**
 * Dodaje notatkę wewnętrzną do wskazanego wątku.
 */
export async function addInternalComment(threadId, content) {
  try {
    const auth = await requireCreatorOrAdmin();
    if (!auth.ok) return { success: false, error: auth.error };

    if (!threadId || typeof threadId !== "string") {
      return { success: false, error: "Nieprawidłowe ID wątku." };
    }

    const normalizedContent = typeof content === "string" ? content.trim() : "";
    if (!normalizedContent) {
      return { success: false, error: "Treść komentarza jest wymagana." };
    }

    const created = await prisma.internalComment.create({
      data: {
        threadId,
        content: normalizedContent,
        authorId: auth.userId,
      },
    });

    revalidatePath("/dashboard/skrzynka");
    revalidatePath("/student/skrzynka");

    return { success: true, data: created };
  } catch (error) {
    console.error("addInternalComment:", error);
    return { success: false, error: "Nie udało się dodać komentarza wewnętrznego." };
  }
}

export async function getAssignableInboxUsers() {
  try {
    const auth = await requireCreatorOrAdmin();
    if (!auth.ok) return [];

    const users = await prisma.user.findMany({
      where: {
        role: { in: ["ADMIN", "KREATOR"] },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return users;
  } catch (error) {
    console.error("getAssignableInboxUsers:", error);
    return [];
  }
}

/**
 * Wysyła prawdziwego maila przez Nodemailer i zapisuje go w historii leada.
 */
export async function sendEmailToLead(leadId, toEmail, subject, body) {
  try {
    const auth = await requireCreatorOrAdmin();
    if (!auth.ok) return { success: false, error: auth.error };

    if (!leadId || !toEmail || !body) {
      return { success: false, error: "Brakuje wymaganych danych do wysyłki." };
    }

    const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { id: true, ownerId: true } });
    if (!lead) return { success: false, error: "Lead nie istnieje." };
    if (!isAdminRole(auth.role) && lead.ownerId !== auth.userId) {
      return { success: false, error: "Brak uprawnień do wysyłki do tego leada." };
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

    await addLeadActivity(leadId, 'EMAIL_OPEN');

    // 3. Odświeżenie widoku profilu leada
    revalidatePath(`/crm/lead/${leadId}`);
    revalidatePath("/dashboard/skrzynka");
    revalidatePath("/student/skrzynka");
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
  CrmCustomMessage: {
    Component: CrmCustomMessage,
    getSubject: getCrmCustomMessageSubject,
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
    const auth = await requireCreatorOrAdmin();
    if (!auth.ok) return { success: false, error: auth.error };

    if (!leadId || !toEmail || !templateName) {
      return { success: false, error: "Brakuje wymaganych danych do wysyłki." };
    }

    const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { id: true, ownerId: true } });
    if (!lead) return { success: false, error: "Lead nie istnieje." };
    if (!isAdminRole(auth.role) && lead.ownerId !== auth.userId) {
      return { success: false, error: "Brak uprawnień do wysyłki do tego leada." };
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

    const preview =
      typeof text === "string" && text.trim()
        ? text.replace(/\s+/g, " ").trim().slice(0, 300)
        : "[HTML email sent]";

    const savedMessage = await prisma.message.create({
      data: {
        leadId,
        subject,
        // Store only a short preview for mailbox/history (do not store full HTML).
        body: preview,
        type: "EMAIL",
        direction: "OUTBOUND",
      },
    });

    await addLeadActivity(leadId, 'EMAIL_OPEN');

    revalidatePath(`/crm/lead/${leadId}`);
    revalidatePath("/dashboard/skrzynka");
    revalidatePath("/student/skrzynka");
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
    const auth = await requireCreatorOrAdmin();
    if (!auth.ok) return { success: false, error: auth.error };

    if (!leadId || !body) {
      return { success: false, error: "Brakuje wymaganych danych dla SMS." };
    }

    const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { id: true, ownerId: true } });
    if (!lead) return { success: false, error: "Lead nie istnieje." };
    if (!isAdminRole(auth.role) && lead.ownerId !== auth.userId) {
      return { success: false, error: "Brak uprawnień do wysyłki do tego leada." };
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

    await addLeadActivity(leadId, 'SMS_SENT');

    revalidatePath(`/crm/lead/${leadId}`);
    revalidatePath("/dashboard/skrzynka");
    revalidatePath("/student/skrzynka");
    return { success: true, data: savedSMS };

  } catch (error) {
    console.error("Błąd podczas symulacji SMS:", error);
    return { success: false, error: "Nie udało się zapisać wiadomości SMS." };
  }
}