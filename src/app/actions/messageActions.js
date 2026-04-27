"use server";

import { prisma } from "@/lib/prisma";
import { transporter, mailOptions } from "@/lib/nodemailer";
import { revalidatePath } from "next/cache";
import { render } from "@react-email/render";
import React from "react";
import { requireUser, requireLeadOwnership, Roles } from "@/lib/rbac";
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
 * Sesja jest weryfikowana PRZED jakimkolwiek zapytaniem do bazy.
 * Kreator widzi tylko swoje leady; admin — wszystkie; uczestnik — po emailu.
 * @param {string} leadId
 */
export async function getLeadMessages(leadId, filters = {}) {
  try {
    if (!leadId || typeof leadId !== "string") {
      return null;
    }

    const auth = await requireUser();
    if (!auth.ok) return null;

    let whereClause = { id: leadId };

    if (auth.role === Roles.KREATOR) {
      whereClause = { id: leadId, ownerId: auth.userId };
    } else if (auth.role === Roles.UCZESTNIK) {
      const email = auth.session?.user?.email ?? null;
      if (!email) return null;
      whereClause = { id: leadId, email };
    }
    // ADMIN — brak dodatkowych filtrów

    const lead = await prisma.lead.findFirst({
      where: whereClause,
      include: {
        messages: {
          where: {
            ...(typeof filters?.teamId === "string" && filters.teamId.trim()
              ? { teamId: filters.teamId.trim() }
              : {}),
            ...(filters?.privateOnly ? { teamId: null } : {}),
            ...(typeof filters?.messageType === "string" && filters.messageType.trim()
              ? { messageType: filters.messageType.trim().toUpperCase() }
              : {}),
            ...(filters?.includeInternalNotes === false
              ? { NOT: { messageType: "INTERNAL_NOTE" } }
              : {}),
          },
          orderBy: { createdAt: "asc" },
          include: {
            team: { select: { id: true, name: true } },
            assignedTo: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!lead) return null;

    return lead;
  } catch (error) {
    console.error("getLeadMessages:", error);
    return null;
  }
}

/**
 * Wysyła prawdziwego maila przez Nodemailer i zapisuje go w historii leada.
 */
export async function sendEmailToLead(leadId, toEmail, subject, body, options = {}) {
  try {
    if (!leadId || !toEmail || !body) {
      return { success: false, error: "Brakuje wymaganych danych do wysyłki." };
    }

    const ownership = await requireLeadOwnership(prisma, leadId);
    if (!ownership.ok) return { success: false, error: ownership.error };

    await transporter.sendMail({
      from: mailOptions.from,
      to: toEmail,
      subject: subject || "Wiadomość z systemu CRM",
      text: body,
    });

    const savedMessage = await prisma.message.create({
      data: {
        leadId,
        subject,
        body,
        type: "EMAIL",
        direction: "OUTBOUND",
        messageType:
          typeof options?.messageType === "string" && options.messageType.trim()
            ? options.messageType.trim().toUpperCase()
            : "EMAIL",
        teamId: typeof options?.teamId === "string" ? options.teamId : null,
        assignedToId:
          typeof options?.assignedToId === "string" ? options.assignedToId : null,
        ticketStatus:
          typeof options?.ticketStatus === "string" ? options.ticketStatus : null,
      },
    });

    await addLeadActivity(leadId, 'EMAIL_OPEN');

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
export async function sendTemplatedEmail(
  leadId,
  toEmail,
  templateName,
  props,
  options = {}
) {
  try {
    if (!leadId || !toEmail || !templateName) {
      return { success: false, error: "Brakuje wymaganych danych do wysyłki." };
    }

    const ownership = await requireLeadOwnership(prisma, leadId);
    if (!ownership.ok) return { success: false, error: ownership.error };

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

    const normalizedMessageType =
      typeof options?.messageType === "string" && options.messageType.trim()
        ? options.messageType.trim().toUpperCase()
        : "EMAIL";

    const savedMessage = await prisma.message.create({
      data: {
        leadId,
        subject,
        // Store only a short preview for mailbox/history (do not store full HTML).
        body: preview,
        type: "EMAIL",
        direction: "OUTBOUND",
        messageType: normalizedMessageType,
        teamId: typeof options?.teamId === "string" ? options.teamId : null,
        assignedToId:
          typeof options?.assignedToId === "string" ? options.assignedToId : null,
        ticketStatus:
          typeof options?.ticketStatus === "string" ? options.ticketStatus : null,
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
export async function simulateSMSToLead(leadId, phone, body, options = {}) {
  try {
    if (!leadId || !body) {
      return { success: false, error: "Brakuje wymaganych danych dla SMS." };
    }

    const ownership = await requireLeadOwnership(prisma, leadId);
    if (!ownership.ok) return { success: false, error: ownership.error };

    const savedSMS = await prisma.message.create({
      data: {
        leadId,
        subject: "Wiadomość SMS",
        body,
        type: "SMS",
        direction: "OUTBOUND",
        messageType:
          typeof options?.messageType === "string" && options.messageType.trim()
            ? options.messageType.trim().toUpperCase()
            : "CHAT",
        teamId: typeof options?.teamId === "string" ? options.teamId : null,
        assignedToId:
          typeof options?.assignedToId === "string" ? options.assignedToId : null,
        ticketStatus:
          typeof options?.ticketStatus === "string" ? options.ticketStatus : null,
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

/**
 * Dodaje wewnętrzny komentarz do wątku leada.
 * Komentarz nie jest wysyłany na zewnątrz i służy tylko zespołowi.
 */
export async function addInternalNote(leadId, body, options = {}) {
  try {
    if (!leadId || !body) {
      return { success: false, error: "Brakuje danych dla komentarza wewnętrznego." };
    }

    const ownership = await requireLeadOwnership(prisma, leadId);
    if (!ownership.ok) return { success: false, error: ownership.error };

    const note = await prisma.message.create({
      data: {
        leadId,
        subject:
          typeof options?.subject === "string" && options.subject.trim()
            ? options.subject.trim()
            : "Komentarz wewnętrzny",
        body,
        type: "NOTE",
        direction: "INTERNAL",
        messageType: "INTERNAL_NOTE",
        teamId: typeof options?.teamId === "string" ? options.teamId : null,
        assignedToId:
          typeof options?.assignedToId === "string" ? options.assignedToId : null,
        ticketStatus:
          typeof options?.ticketStatus === "string" ? options.ticketStatus : null,
      },
      include: {
        team: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });

    revalidatePath(`/crm/lead/${leadId}`);
    revalidatePath("/dashboard/skrzynka");
    revalidatePath("/student/skrzynka");
    return { success: true, data: note };
  } catch (error) {
    console.error("addInternalNote:", error);
    return { success: false, error: "Nie udało się zapisać komentarza wewnętrznego." };
  }
}

/**
 * Wysyła wiadomość wewnętrzną (chat) w ramach zespołu.
 * Nie używa SMTP — zapisuje wyłącznie rekord Message.
 */
export async function sendInternalChatMessage(leadId, body, options = {}) {
  try {
    if (!leadId || !body) {
      return { success: false, error: "Brakuje danych dla wiadomości." };
    }

    const auth = await requireUser();
    if (!auth.ok) return { success: false, error: auth.error };

    const ownership = await requireLeadOwnership(prisma, leadId);
    if (!ownership.ok) return { success: false, error: ownership.error };

    const teamIdRaw = typeof options?.teamId === "string" ? options.teamId.trim() : "";

    // Jeśli wiadomość idzie w kontekście zespołu, wymagamy członkostwa (lub ADMIN).
    if (teamIdRaw) {
      const team = await prisma.team.findUnique({
        where: { id: teamIdRaw },
        select: {
          id: true,
          members: { select: { userId: true } },
        },
      });
      if (!team) return { success: false, error: "Zespół nie istnieje." };

      const isMember = team.members.some((m) => m.userId === auth.userId);
      if (auth.role !== Roles.ADMIN && !isMember) {
        return {
          success: false,
          error: "Brak uprawnień do wysyłania wiadomości w tym zespole.",
        };
      }
    }

    const saved = await prisma.message.create({
      data: {
        leadId,
        subject: null,
        body,
        type: "CHAT",
        direction: "INTERNAL",
        messageType: "CHAT",
        teamId: teamIdRaw || null,
        assignedToId:
          typeof options?.assignedToId === "string" ? options.assignedToId : null,
        ticketStatus:
          typeof options?.ticketStatus === "string" ? options.ticketStatus : null,
      },
      include: {
        team: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });

    revalidatePath(`/crm/lead/${leadId}`);
    revalidatePath("/dashboard/skrzynka");
    revalidatePath("/student/skrzynka");
    return { success: true, data: saved };
  } catch (error) {
    console.error("sendInternalChatMessage:", error);
    return { success: false, error: "Nie udało się wysłać wiadomości czatu." };
  }
}

/**
 * Przypisuje ownera konwersacji (globalnie lub w obrębie kanału zespołu).
 */
export async function assignConversationOwner(leadId, assignedToId, options = {}) {
  try {
    if (!leadId) return { success: false, error: "Brakuje leadId." };

    const auth = await requireUser();
    if (!auth.ok) return { success: false, error: auth.error };

    const ownership = await requireLeadOwnership(prisma, leadId);
    if (!ownership.ok) return { success: false, error: ownership.error };

    const teamIdRaw = typeof options?.teamId === "string" ? options.teamId.trim() : "";
    if (!teamIdRaw) {
      return { success: false, error: "Owner konwersacji działa tylko w kontekście zespołu." };
    }

    const team = await prisma.team.findUnique({
      where: { id: teamIdRaw },
      select: {
        id: true,
        members: { select: { userId: true } },
      },
    });
    if (!team) return { success: false, error: "Zespół nie istnieje." };

    const isMember = team.members.some((m) => m.userId === auth.userId);
    if (auth.role !== Roles.ADMIN && !isMember) {
      return { success: false, error: "Brak uprawnień do zarządzania ownerem w tym zespole." };
    }

    const ownerValue =
      typeof assignedToId === "string" && assignedToId.trim() ? assignedToId : null;

    await prisma.message.updateMany({
      where: {
        leadId,
        teamId: teamIdRaw,
      },
      data: {
        assignedToId: ownerValue,
      },
    });

    await prisma.message.create({
      data: {
        leadId,
        teamId: teamIdRaw,
        type: "SYSTEM",
        direction: "INTERNAL",
        subject: "Zmiana ownera",
        body: ownerValue ? "Przypisano nowego ownera konwersacji." : "Usunięto ownera konwersacji.",
        messageType: "SYSTEM",
        assignedToId: ownerValue,
      },
    });

    revalidatePath(`/crm/lead/${leadId}`);
    revalidatePath("/dashboard/skrzynka");
    return { success: true };
  } catch (error) {
    console.error("assignConversationOwner:", error);
    return { success: false, error: "Nie udało się zaktualizować ownera." };
  }
}