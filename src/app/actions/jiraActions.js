"use server";

import { getServerSession } from "next-auth/next";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getCurrentUserIdOrThrow() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    throw new Error("Brak autoryzacji. Zaloguj się ponownie.");
  }

  return userId;
}

function isTokenExpired(expiresAt) {
  if (!expiresAt) return false;
  return expiresAt <= Math.floor(Date.now() / 1000);
}

async function getAtlassianAccountOrThrow(userId) {
  const account = await prisma.account.findFirst({
    where: {
      userId,
      provider: "atlassian",
    },
    select: {
      access_token: true,
      expires_at: true,
    },
  });

  if (!account?.access_token) {
    throw new Error("Brak podłączonej integracji Atlassian.");
  }

  if (isTokenExpired(account.expires_at)) {
    // TODO: Refresh Token Rotation:
    // 1) Użyć refresh_token do odświeżenia access_token
    // 2) Zapisać nowe tokeny w tabeli Account
    // 3) Ponowić request do Jira API
    throw new Error("Token Atlassian wygasł. Połącz integrację ponownie.");
  }

  return account;
}

export async function getJiraProjects() {
  try {
    const userId = await getCurrentUserIdOrThrow();
    const account = await getAtlassianAccountOrThrow(userId);

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
      ? resources.find(
          (resource) =>
            Array.isArray(resource?.scopes) &&
            resource.scopes.includes("read:jira-work")
        )
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
          Authorization: `Bearer ${account.access_token}`,
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

    return {
      success: true,
      cloudId,
      projects,
    };
  } catch (error) {
    console.error("getJiraProjects:", error);
    return {
      success: false,
      message: "Błąd pobierania projektów Jira.",
      projects: [],
      cloudId: null,
    };
  }
}

export async function saveJiraProjectSelection({ projectKey, projectName, cloudId }) {
  try {
    const userId = await getCurrentUserIdOrThrow();
    const normalizedProjectKey =
      typeof projectKey === "string" ? projectKey.trim().toUpperCase() : "";
    const normalizedProjectName =
      typeof projectName === "string" ? projectName.trim() : "";
    const normalizedCloudId = typeof cloudId === "string" ? cloudId.trim() : "";

    if (!normalizedProjectKey || !normalizedProjectName || !normalizedCloudId) {
      return { success: false, message: "Niepoprawne dane projektu Jira." };
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        jiraSelectedProjectKey: normalizedProjectKey,
        jiraSelectedProjectName: normalizedProjectName,
        jiraSelectedCloudId: normalizedCloudId,
      },
    });

    revalidatePath("/dashboard/ustawienia");
    return { success: true, message: "Zapisano wybrany projekt Jira." };
  } catch (error) {
    console.error("saveJiraProjectSelection:", error);
    return { success: false, message: "Nie udało się zapisać projektu Jira." };
  }
}
