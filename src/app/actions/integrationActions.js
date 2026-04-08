"use server";

import { createCipheriv, randomBytes } from "node:crypto";
import { getServerSession } from "next-auth/next";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getApiKeyProviderConfig } from "@/lib/integrations/apiKeyProviders";

function isTokenExpired(expiresAt) {
  if (!expiresAt) return false;
  const nowInSeconds = Math.floor(Date.now() / 1000);
  return expiresAt <= nowInSeconds;
}

async function getValidOAuthAccount(userId, provider) {
  const account = await prisma.account.findFirst({
    where: { userId, provider },
    select: {
      access_token: true,
      refresh_token: true,
      expires_at: true,
    },
  });

  if (!account?.access_token) {
    return { success: false, message: `Brak aktywnej integracji ${provider}.` };
  }

  if (isTokenExpired(account.expires_at)) {
    // TODO: Implement Refresh Token Rotation:
    // 1) Use refresh_token in provider token endpoint
    // 2) Persist rotated access_token/refresh_token in Account table
    // 3) Retry the original request with fresh access token
    return {
      success: false,
      message: `Token dostępu dla ${provider} wygasł. Wymagane ponowne połączenie.`,
    };
  }

  return { success: true, account };
}

async function fetchJiraProjects(userId) {
  const accountResult = await getValidOAuthAccount(userId, "atlassian");
  if (!accountResult.success) {
    return {
      success: false,
      message: accountResult.message,
      projects: [],
      cloudId: null,
    };
  }

  const resourcesResponse = await fetch(
    "https://api.atlassian.com/oauth/token/accessible-resources",
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accountResult.account.access_token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }
  );

  if (!resourcesResponse.ok) {
    return {
      success: false,
      message: "Nie udało się pobrać zasobów Atlassian.",
      projects: [],
      cloudId: null,
    };
  }

  const resources = await resourcesResponse.json();
  const jiraResource = Array.isArray(resources)
    ? resources.find((resource) => Array.isArray(resource?.scopes) && resource.scopes.includes("read:jira-work"))
    : null;

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
        Authorization: `Bearer ${accountResult.account.access_token}`,
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
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    throw new Error("Brak autoryzacji. Zaloguj się ponownie.");
  }

  return userId;
}

export async function getIntegrationsData() {
  try {
    const userId = await getCurrentUserIdOrThrow();

    const [accounts, user] = await Promise.all([
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
    ]);

    const connectedProviders = [...new Set(accounts.map((item) => item.provider))];
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
      },
    };
  } catch (error) {
    console.error("getIntegrationsData:", error);
    return { success: false, message: "Nie udało się pobrać danych integracji." };
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
