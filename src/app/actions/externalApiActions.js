"use server";

import { prisma } from "@/lib/prisma";

function assertTokenAvailability(account) {
  if (!account?.access_token) {
    throw new Error("Brak tokenu dostępu dla tej integracji.");
  }

  if (!account?.expires_at) {
    return;
  }

  const nowInSeconds = Math.floor(Date.now() / 1000);
  if (account.expires_at <= nowInSeconds) {
    // TODO: W tym miejscu zespół powinien wdrożyć Refresh Token Rotation
    // (użycie refresh_token, wymiana access_token i aktualizacja rekordu Account).
    throw new Error("Token wygasł. Wymagane odświeżenie autoryzacji.");
  }
}

async function getOAuthAccountOrThrow(userId, provider) {
  if (!userId) {
    throw new Error("Brak userId.");
  }

  const account = await prisma.account.findFirst({
    where: {
      userId,
      provider,
    },
    select: {
      access_token: true,
      refresh_token: true,
      expires_at: true,
    },
  });

  if (!account) {
    throw new Error(`Brak podłączonej integracji OAuth dla: ${provider}.`);
  }

  assertTokenAvailability(account);
  return account;
}

export async function fetchGoogleCalendar(userId) {
  try {
    const account = await getOAuthAccountOrThrow(userId, "google");

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
    const account = await getOAuthAccountOrThrow(userId, "azure-ad");

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
    const account = await getOAuthAccountOrThrow(userId, "atlassian");

    const resourcesResponse = await fetch(
      "https://api.atlassian.com/oauth/token/accessible-resources",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${account.access_token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    if (resourcesResponse.status === 401) {
      // TODO: Tutaj należy uruchomić flow odświeżenia tokenu i ponowić request.
      throw new Error("Brak autoryzacji Atlassian API (401).");
    }

    if (!resourcesResponse.ok) {
      const body = await resourcesResponse.text();
      throw new Error(`Atlassian resources error: ${resourcesResponse.status} ${body}`);
    }

    const resources = await resourcesResponse.json();
    const firstResource = Array.isArray(resources) ? resources[0] : null;
    const cloudId = firstResource?.id || null;
    const siteUrl = firstResource?.url || null;
    if (!cloudId) return [];

    const query = new URLSearchParams({
      jql: "assignee = currentUser() ORDER BY updated DESC",
      maxResults: "25",
      fields: "summary,status,assignee,updated",
    });

    const issuesResponse = await fetch(
      `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/search?${query.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${account.access_token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    if (issuesResponse.status === 401) {
      // TODO: Tutaj należy uruchomić flow odświeżenia tokenu i ponowić request.
      throw new Error("Brak autoryzacji Jira API (401).");
    }

    if (!issuesResponse.ok) {
      const body = await issuesResponse.text();
      throw new Error(`Jira search error: ${issuesResponse.status} ${body}`);
    }

    const data = await issuesResponse.json();
    const issues = Array.isArray(data?.issues) ? data.issues : [];

    return issues.map((issue) => ({
      id: issue.id,
      key: issue.key,
      summary: issue?.fields?.summary || "Brak tytułu",
      status: issue?.fields?.status?.name || "Unknown",
      updatedAt: issue?.fields?.updated || null,
      url: siteUrl ? `${siteUrl}/browse/${issue.key}` : null,
    }));
  } catch (error) {
    console.error("fetchJiraIssues:", error);
    throw error;
  }
}
