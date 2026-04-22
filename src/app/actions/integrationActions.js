"use server";

import { createCipheriv, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getApiKeyProviderConfig } from "@/lib/integrations/apiKeyProviders";
import { getOAuthAccountOrThrow } from "@/lib/integrations/oauthAccounts";
import {
  fetchGoogleCalendarPreview,
  fetchGoogleContacts,
  getGoogleIntegrationForUser,
} from "@/lib/integrations/googleClient";
import {
  fetchJiraIssuesForUser,
  getValidJiraAccessToken,
  discoverJiraResource,
  getJiraIntegrationForUser,
} from "@/lib/integrations/jiraClient";
import { requireCreator, requireUser, isAdminRole } from "@/lib/rbac";

async function fetchJiraProjects(userId) {
  let accessToken;
  try {
    accessToken = await getValidJiraAccessToken(userId);
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Brak aktywnej integracji atlassian.",
      projects: [],
      cloudId: null,
    };
  }

  const jiraResource = await discoverJiraResource(accessToken).catch(() => null);

  const cloudId = jiraResource?.id || null;
  if (!cloudId) {
    return {
      success: false,
      message: "Nie znaleziono dostępnej instancji Jira Cloud.",
      projects: [],
      cloudId: null,
    };
  }

  const projectsResponse = await fetch(
    `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/project/search?maxResults=50&orderBy=name`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }
  );

  if (!projectsResponse.ok) {
    return {
      success: false,
      message: "Nie udało się pobrać projektów Jira.",
      projects: [],
      cloudId,
    };
  }

  const projectsBody = await projectsResponse.json();
  const projects = Array.isArray(projectsBody?.values)
    ? projectsBody.values.map((project) => ({
        id: project.id,
        key: project.key,
        name: project.name,
      }))
    : [];

  return { success: true, projects, cloudId };
}

export async function getOutlookEventsPreview() {
  try {
    const userId = await getCurrentUserIdOrThrow();
    const account = await getOAuthAccountOrThrow(userId, "azure-ad");

    const params = new URLSearchParams({
      $top: "10",
      $orderby: "start/dateTime",
      startDateTime: new Date().toISOString(),
      endDateTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    });

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/calendarView?${params.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${account.access_token}`,
          "Content-Type": "application/json",
          Prefer: 'outlook.timezone="UTC"',
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return { success: false, message: "Nie udało się pobrać wydarzeń Outlook.", events: [] };
    }

    const body = await response.json();
    const events = Array.isArray(body?.value)
      ? body.value.map((event) => ({
          id: event.id,
          subject: event.subject || "Bez tytułu",
          start: event?.start?.dateTime || null,
          end: event?.end?.dateTime || null,
          webLink: event?.webLink || null,
        }))
      : [];

    return { success: true, message: "Pobrano wydarzenia Outlook.", events };
  } catch (error) {
    console.error("getOutlookEventsPreview:", error);
    return { success: false, message: "Błąd pobierania wydarzeń Outlook.", events: [] };
  }
}

export async function syncOutlookNow() {
  try {
    const result = await getOutlookEventsPreview();
    if (!result.success) {
      return { success: false, message: result.message, syncedCount: 0, events: [] };
    }

    return {
      success: true,
      message: `Synchronizacja Outlook zakończona. Pobrano ${result.events.length} wydarzeń.`,
      syncedCount: result.events.length,
      events: result.events,
    };
  } catch (error) {
    console.error("syncOutlookNow:", error);
    return { success: false, message: "Błąd synchronizacji Outlook.", syncedCount: 0, events: [] };
  }
}

function encryptApiKey(plainTextKey) {
  const secret = process.env.INTEGRATION_API_KEY_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "Brak poprawnej konfiguracji INTEGRATION_API_KEY_SECRET (min. 32 znaki)."
    );
  }

  const iv = randomBytes(12);
  const key = Buffer.from(secret.slice(0, 32), "utf8");
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plainTextKey, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

async function getCurrentUserIdOrThrow() {
  const auth = await requireUser();
  if (!auth.ok || !auth.userId) throw new Error(auth.error || "Brak autoryzacji. Zaloguj się ponownie.");
  return auth.userId;
}

export async function getIntegrationsData() {
  try {
    const userId = await getCurrentUserIdOrThrow();

    const [accounts, user, googleIntegration, jiraIntegration] = await Promise.all([
      prisma.account.findMany({
        where: { userId },
        select: { provider: true },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          jiraSelectedProjectKey: true,
          jiraSelectedProjectName: true,
          jiraSelectedCloudId: true,
        },
      }),
      getGoogleIntegrationForUser(userId),
      getJiraIntegrationForUser(userId),
    ]);

    const connectedProviders = [...new Set(accounts.map((item) => item.provider))];
    if (googleIntegration?.status === "CONNECTED" && !connectedProviders.includes("google")) {
      connectedProviders.push("google");
    }
    if (jiraIntegration?.status === "CONNECTED" && !connectedProviders.includes("atlassian")) {
      connectedProviders.push("atlassian");
    }
    const jiraConnected = connectedProviders.includes("atlassian");

    let jiraProjects = [];
    let jiraProjectsError = null;

    if (jiraConnected) {
      const projectsResult = await fetchJiraProjects(userId);
      if (projectsResult.success) {
        jiraProjects = projectsResult.projects;
      } else {
        jiraProjectsError = projectsResult.message;
      }
    }

    return {
      success: true,
      data: {
        connectedProviders,
        jiraProjects,
        jiraProjectsError,
        jiraSelectedProjectKey: user?.jiraSelectedProjectKey || null,
        jiraSelectedProjectName: user?.jiraSelectedProjectName || null,
        jiraSelectedCloudId: user?.jiraSelectedCloudId || null,
        googleStatus: googleIntegration?.status || "DISCONNECTED",
        googleEmail: googleIntegration?.externalEmail || null,
        googleLastSyncedAt: googleIntegration?.lastSyncedAt || null,
        googleCalendarLastSyncedAt: googleIntegration?.calendarLastSyncedAt || null,
        googleContactsLastSyncedAt: googleIntegration?.contactsLastSyncedAt || null,
        googleLastError: googleIntegration?.lastError || null,
        jiraStatus: jiraIntegration?.status || "DISCONNECTED",
        jiraLastSyncedAt: jiraIntegration?.ticketsLastSyncedAt || null,
        jiraLastError: jiraIntegration?.lastError || null,
      },
    };
  } catch (error) {
    console.error("getIntegrationsData:", error);
    return { success: false, message: "Nie udało się pobrać danych integracji." };
  }
}

export async function getGoogleEventsPreview() {
  try {
    const userId = await getCurrentUserIdOrThrow();
    const events = await fetchGoogleCalendarPreview(userId);
    return { success: true, events };
  } catch (error) {
    console.error("getGoogleEventsPreview:", error);
    return { success: false, message: "Nie udało się pobrać wydarzeń Google.", events: [] };
  }
}

export async function syncGoogleNow() {
  try {
    const userId = await getCurrentUserIdOrThrow();
    const events = await fetchGoogleCalendarPreview(userId);
    await prisma.oAuthIntegration.update({
      where: {
        ownerId_provider: {
          ownerId: userId,
          provider: "GOOGLE",
        },
      },
      data: {
        lastSyncedAt: new Date(),
        calendarLastSyncedAt: new Date(),
        lastError: null,
      },
    });
    revalidatePath("/dashboard/ustawienia");
    revalidatePath("/dashboard/calendar");
    return {
      success: true,
      message: `Synchronizacja Google zakończona. Pobrano ${events.length} wydarzeń.`,
      events,
    };
  } catch (error) {
    console.error("syncGoogleNow:", error);
    const userId = await getCurrentUserIdOrThrow().catch(() => null);
    if (userId) {
      await prisma.oAuthIntegration
        .update({
          where: {
            ownerId_provider: {
              ownerId: userId,
              provider: "GOOGLE",
            },
          },
          data: {
            status: "ERROR",
            lastError: "Synchronizacja Google nie powiodła się.",
          },
        })
        .catch(() => null);
    }
    return { success: false, message: "Błąd synchronizacji Google.", events: [] };
  }
}

export async function getGoogleContactsPreview() {
  try {
    const userId = await getCurrentUserIdOrThrow();
    const contacts = await fetchGoogleContacts(userId);
    return { success: true, contacts: contacts.slice(0, 10) };
  } catch (error) {
    console.error("getGoogleContactsPreview:", error);
    return { success: false, message: "Nie udało się pobrać kontaktów Google.", contacts: [] };
  }
}

export async function syncGoogleContactsNow() {
  try {
    const auth = await requireCreator();
    if (!auth.ok) return { success: false, message: auth.error, contacts: [] };
    const contacts = await fetchGoogleContacts(auth.userId);

    for (const contact of contacts) {
      await prisma.lead.upsert({
        where: {
          ownerId_email: {
            ownerId: auth.userId,
            email: contact.email,
          },
        },
        create: {
          ownerId: auth.userId,
          email: contact.email,
          firstName: contact.firstName || "Kontakt",
          lastName: contact.lastName || null,
          phone: contact.phone || null,
          source: "Google Contacts",
          status: "NEW",
          score: 10,
        },
        update: {
          firstName: contact.firstName || undefined,
          lastName: contact.lastName || undefined,
          phone: contact.phone || undefined,
          source: "Google Contacts",
          score: { increment: isAdminRole(auth.role) ? 0 : 1 },
        },
      });
    }

    await prisma.oAuthIntegration.update({
      where: {
        ownerId_provider: {
          ownerId: auth.userId,
          provider: "GOOGLE",
        },
      },
      data: {
        lastSyncedAt: new Date(),
        contactsLastSyncedAt: new Date(),
        lastError: null,
      },
    });

    revalidatePath("/dashboard/ustawienia");
    revalidatePath("/dashboard/skrzynka");
    return {
      success: true,
      message: `Zaimportowano ${contacts.length} kontaktów Google do skrzynki.`,
      contacts: contacts.slice(0, 10),
    };
  } catch (error) {
    console.error("syncGoogleContactsNow:", error);
    return { success: false, message: "Błąd importu kontaktów Google.", contacts: [] };
  }
}

export async function syncJiraTicketsNow() {
  try {
    const userId = await getCurrentUserIdOrThrow();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { jiraSelectedProjectKey: true },
    });
    const jql = user?.jiraSelectedProjectKey
      ? `project = ${user.jiraSelectedProjectKey} ORDER BY updated DESC`
      : "assignee = currentUser() ORDER BY updated DESC";
    const issues = await fetchJiraIssuesForUser({ userId, jql, maxResults: 25 });
    await prisma.oAuthIntegration.update({
      where: {
        ownerId_provider: {
          ownerId: userId,
          provider: "JIRA",
        },
      },
      data: {
        lastSyncedAt: new Date(),
        ticketsLastSyncedAt: new Date(),
        lastError: null,
      },
    });
    revalidatePath("/dashboard/ustawienia");
    revalidatePath("/dashboard/kanban");
    return {
      success: true,
      message: `Synchronizacja Jira zakończona. Pobrano ${issues.length} ticketów.`,
      issues,
    };
  } catch (error) {
    console.error("syncJiraTicketsNow:", error);
    return { success: false, message: "Błąd synchronizacji ticketów Jira.", issues: [] };
  }
}

export async function disconnectJiraIntegration() {
  try {
    const userId = await getCurrentUserIdOrThrow();
    await prisma.oAuthIntegration
      .delete({
        where: {
          ownerId_provider: {
            ownerId: userId,
            provider: "JIRA",
          },
        },
      })
      .catch(() => null);
    await prisma.oAuthState.deleteMany({
      where: { userId, provider: "JIRA" },
    });
    revalidatePath("/dashboard/ustawienia");
    revalidatePath("/dashboard/kanban");
    return { success: true, message: "Rozłączono integrację Jira." };
  } catch (error) {
    console.error("disconnectJiraIntegration:", error);
    return { success: false, message: "Nie udało się rozłączyć integracji Jira." };
  }
}

export async function disconnectGoogleIntegration() {
  try {
    const userId = await getCurrentUserIdOrThrow();
    await prisma.oAuthIntegration
      .delete({
        where: {
          ownerId_provider: {
            ownerId: userId,
            provider: "GOOGLE",
          },
        },
      })
      .catch(() => null);

    await prisma.oAuthState.deleteMany({
      where: { userId, provider: "GOOGLE" },
    });

    revalidatePath("/dashboard/ustawienia");
    revalidatePath("/dashboard/calendar");
    return { success: true, message: "Rozłączono integrację Google." };
  } catch (error) {
    console.error("disconnectGoogleIntegration:", error);
    return { success: false, message: "Nie udało się rozłączyć integracji Google." };
  }
}

export async function disconnectOAuthIntegration(provider) {
  try {
    const userId = await getCurrentUserIdOrThrow();
    const normalizedProvider =
      typeof provider === "string" ? provider.trim().toLowerCase() : "";

    if (!normalizedProvider) {
      return { success: false, message: "Nie podano dostawcy integracji." };
    }

    await prisma.account.deleteMany({
      where: {
        userId,
        provider: normalizedProvider,
      },
    });

    revalidatePath("/dashboard/ustawienia");
    return { success: true, message: "Integracja została odłączona." };
  } catch (error) {
    console.error("disconnectOAuthIntegration:", error);
    return { success: false, message: "Nie udało się odłączyć integracji." };
  }
}

export async function saveApiKeyIntegration(data) {
  try {
    const userId = await getCurrentUserIdOrThrow();
    const providerId =
      typeof data?.providerId === "string" ? data.providerId.trim().toLowerCase() : "";
    const apiKey = typeof data?.apiKey === "string" ? data.apiKey.trim() : "";

    if (!providerId) {
      return { success: false, message: "Wybierz dostawcę integracji." };
    }

    const providerConfig = getApiKeyProviderConfig(providerId);
    if (!providerConfig) {
      return { success: false, message: "Wybrany dostawca nie jest wspierany." };
    }

    if (!apiKey) {
      return { success: false, message: "Klucz API jest wymagany." };
    }

    const encryptedKey = encryptApiKey(apiKey);

    await prisma.apiKeyIntegration.upsert({
      where: {
        userId_providerName: {
          userId,
          providerName: providerConfig.id,
        },
      },
      create: {
        userId,
        providerName: providerConfig.id,
        encryptedKey,
      },
      update: {
        encryptedKey,
      },
    });

    revalidatePath("/dashboard/ustawienia");
    return {
      success: true,
      message: `Klucz API dla ${providerConfig.label} został zapisany.`,
    };
  } catch (error) {
    console.error("saveApiKeyIntegration:", error);
    return { success: false, message: "Nie udało się zapisać klucza API." };
  }
}
