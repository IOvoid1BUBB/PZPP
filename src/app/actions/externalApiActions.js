"use server";

import { prisma } from "@/lib/prisma";
import { getOAuthAccountOrThrow } from "@/lib/integrations/oauthAccounts";
import { fetchJiraIssuesForUser } from "@/lib/integrations/jiraClient";
import { requireUser } from "@/lib/rbac";

export async function fetchGoogleCalendar(userId) {
  try {
    const auth = await requireUser();
    if (!auth.ok || !auth.userId) throw new Error(auth.error || "Brak autoryzacji.");
    const account = await getOAuthAccountOrThrow(auth.userId, "google");

    const response = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${account.access_token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    if (response.status === 401) {
      // TODO: Tutaj należy uruchomić flow odświeżenia tokenu i ponowić request.
      throw new Error("Brak autoryzacji Google API (401).");
    }

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Google API error: ${response.status} ${errorBody}`);
    }

    return await response.json();
  } catch (error) {
    console.error("fetchGoogleCalendar:", error);
    throw error;
  }
}

export async function fetchOutlookMails(userId) {
  try {
    const auth = await requireUser();
    if (!auth.ok || !auth.userId) throw new Error(auth.error || "Brak autoryzacji.");
    const account = await getOAuthAccountOrThrow(auth.userId, "azure-ad");

    const response = await fetch("https://graph.microsoft.com/v1.0/me/messages", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${account.access_token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (response.status === 401) {
      // TODO: Tutaj należy uruchomić flow odświeżenia tokenu i ponowić request.
      throw new Error("Brak autoryzacji Microsoft Graph API (401).");
    }

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Microsoft Graph API error: ${response.status} ${errorBody}`);
    }

    return await response.json();
  } catch (error) {
    console.error("fetchOutlookMails:", error);
    throw error;
  }
}

export async function fetchJiraIssues(userId) {
  try {
    const auth = await requireUser();
    if (!auth.ok || !auth.userId) return [];
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        jiraSelectedProjectKey: true,
      },
    });

    const jql = user?.jiraSelectedProjectKey
      ? `project = ${user.jiraSelectedProjectKey} ORDER BY updated DESC`
      : "assignee = currentUser() ORDER BY updated DESC";
    return await fetchJiraIssuesForUser({
      userId: auth.userId,
      jql,
      maxResults: 25,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    // Brak OAuth Jira jest scenariuszem opcjonalnym - zwracamy pusta liste.
    if (
      message.includes("Brak podłączonej integracji OAuth dla: atlassian") ||
      message.includes("Brak aktywnej integracji Jira")
    ) {
      return [];
    }

    console.error("fetchJiraIssues:", error);
    return [];
  }
}
