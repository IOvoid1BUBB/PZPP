"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAuth, requireCreatorOrAdmin, isAdminRole, Roles } from "@/lib/rbac";
import { createMeeting, buildMeetingReminderJobs } from "@/app/actions/meetingActions";
import { createNotification, NOTIFICATION_TYPES } from "@/lib/notifications";

export async function createTeam(name, memberIds = []) {
  try {
    const auth = await requireCreatorOrAdmin();
    if (!auth.ok) return { success: false, error: auth.error };

    const normalizedName = typeof name === "string" ? name.trim() : "";
    if (!normalizedName) return { success: false, error: "Nazwa zespołu jest wymagana." };

    const uniqueMembers = [...new Set((Array.isArray(memberIds) ? memberIds : []).filter(Boolean))];
    if (!uniqueMembers.includes(auth.userId)) uniqueMembers.push(auth.userId);

    const createdTeam = await prisma.team.create({
      data: {
        name: normalizedName,
        members: {
          create: uniqueMembers.map((userId) => ({ userId })),
        },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/skrzynka");
    return { success: true, data: createdTeam };
  } catch (error) {
    console.error("createTeam:", error);
    return { success: false, error: "Nie udało się utworzyć zespołu." };
  }
}

export async function getTeams() {
  try {
    const auth = await requireCreatorOrAdmin();
    if (!auth.ok) return [];

    const where = isAdminRole(auth.role)
      ? {}
      : {
          members: {
            some: { userId: auth.userId },
          },
        };

    return await prisma.team.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { joinedAt: "asc" },
        },
      },
    });
  } catch (error) {
    console.error("getTeams:", error);
    return [];
  }
}

export async function getUserTeams(userId) {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return [];

    const targetUserId = typeof userId === "string" && userId.trim() ? userId : auth.userId;
    if (!isAdminRole(auth.role) && targetUserId !== auth.userId) return [];

    return await prisma.team.findMany({
      where: {
        members: {
          some: { userId: targetUserId },
        },
      },
      orderBy: { name: "asc" },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { joinedAt: "asc" },
        },
      },
    });
  } catch (error) {
    console.error("getUserTeams:", error);
    return [];
  }
}

function truncateForPreview(text, maxLen = 90) {
  const s = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!s) return null;
  if (s.length <= maxLen) return s;
  return `${s.slice(0, maxLen - 1)}…`;
}

/**
 * Zespoły użytkownika z podglądem ostatniej wiadomości w kanale (Message.teamId),
 * ograniczone do leadów dostępnych dla roli w sesji.
 */
export async function getUserTeamsInboxSummary(userId) {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return [];

    const targetUserId = typeof userId === "string" && userId.trim() ? userId : auth.userId;
    if (!isAdminRole(auth.role) && targetUserId !== auth.userId) return [];

    const teams = await prisma.team.findMany({
      where: {
        members: {
          some: { userId: targetUserId },
        },
      },
      orderBy: { name: "asc" },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { joinedAt: "asc" },
        },
      },
    });

    /** @type {Record<string, object>} */
    let leadScope = {};
    if (isAdminRole(auth.role)) {
      leadScope = {};
    } else if (auth.role === Roles.KREATOR) {
      leadScope = { ownerId: auth.userId };
    } else if (auth.role === Roles.UCZESTNIK) {
      const email = auth.session?.user?.email ?? null;
      if (!email) return teams.map((t) => ({ ...t, lastPreview: null, lastPreviewAt: null }));
      leadScope = { email: { equals: String(email), mode: "insensitive" } };
    } else {
      return teams.map((t) => ({ ...t, lastPreview: null, lastPreviewAt: null }));
    }

    const summaries = await Promise.all(
      teams.map(async (team) => {
        const last = await prisma.message.findFirst({
          where: {
            teamId: team.id,
            ...(Object.keys(leadScope).length ? { lead: { is: leadScope } } : {}),
          },
          orderBy: { createdAt: "desc" },
          select: {
            body: true,
            subject: true,
            messageType: true,
            createdAt: true,
          },
        });

        const previewSource =
          last?.body || last?.subject || (last?.messageType ? `[${last.messageType}]` : null);

        return {
          ...team,
          lastPreview: truncateForPreview(previewSource),
          lastPreviewAt: last?.createdAt ?? null,
        };
      })
    );

    return summaries;
  } catch (error) {
    console.error("getUserTeamsInboxSummary:", error);
    return [];
  }
}

/**
 * Lista użytkowników do wyboru członków zespołu (tworzenie zespołu).
 */
export async function getUsersForTeamCreation() {
  try {
    const auth = await requireCreatorOrAdmin();
    if (!auth.ok) return [];

    return await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: [{ name: "asc" }, { email: "asc" }],
      take: 200,
    });
  } catch (error) {
    console.error("getUsersForTeamCreation:", error);
    return [];
  }
}

export async function scheduleTeamMeeting(teamId, meetingInput) {
  try {
    const auth = await requireCreatorOrAdmin();
    if (!auth.ok) return { success: false, error: auth.error };
    if (!teamId || typeof teamId !== "string") {
      return { success: false, error: "Nieprawidłowe ID zespołu." };
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { members: { select: { userId: true } } },
    });

    if (!team) return { success: false, error: "Zespół nie istnieje." };

    const isMember = team.members.some((member) => member.userId === auth.userId);
    if (!isAdminRole(auth.role) && !isMember) {
      return { success: false, error: "Brak uprawnień do planowania spotkania dla tego zespołu." };
    }

    const titleBase = typeof meetingInput?.title === "string" ? meetingInput.title.trim() : "";
    const result = await createMeeting({
      ...meetingInput,
      title: titleBase ? `${titleBase} [${team.name}]` : `Spotkanie zespołu: ${team.name}`,
    });

    if (!result?.success || !result?.meeting?.id) return result;

    const attendees = team.members.map((member) => member.userId).filter((id) => id !== auth.userId);
    await Promise.allSettled(
      attendees.map((userId) =>
        createNotification({
          userId,
          type: NOTIFICATION_TYPES.MEETING_CREATED,
          title: `Nowe spotkanie zespołu: ${team.name}`,
          body: result.meeting.title,
          url: `/dashboard/calendar?eventId=${encodeURIComponent(result.meeting.id)}`,
          entityId: result.meeting.id,
        })
      )
    );

    const reminderJobs = buildMeetingReminderJobs({
      meetingId: result.meeting.id,
      title: result.meeting.title,
      startTime: result.meeting.startTime,
      participantUserIds: [auth.userId, ...attendees],
    });

    return {
      success: true,
      teamId,
      meeting: result.meeting,
      reminders: reminderJobs,
    };
  } catch (error) {
    console.error("scheduleTeamMeeting:", error);
    return { success: false, error: "Nie udało się zaplanować spotkania zespołowego." };
  }
}
