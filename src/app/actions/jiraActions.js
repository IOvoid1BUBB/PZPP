"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { fetchJiraIssuesForUser, getValidJiraAccessToken } from "@/lib/integrations/jiraClient";
import { requireUser } from "@/lib/rbac";

async function getCurrentUserIdOrThrow() {
  const auth = await requireUser();
  if (!auth.ok || !auth.userId) throw new Error(auth.error || "Brak autoryzacji. Zaloguj się ponownie.");
  return auth.userId;
}

export async function getJiraProjects() {
  try {
    const userId = await getCurrentUserIdOrThrow();
    const accessToken = await getValidJiraAccessToken(userId);

    const resourcesResponse = await fetch(
      "https://api.atlassian.com/oauth/token/accessible-resources",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
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

export async function getJiraIssuesByProject(projectKey) {
  try {
    const userId = await getCurrentUserIdOrThrow();
    const normalizedProjectKey =
      typeof projectKey === "string" ? projectKey.trim().toUpperCase() : "";

    if (!normalizedProjectKey) {
      return { success: false, message: "Wybierz projekt Jira.", issues: [] };
    }

    const issues = await fetchJiraIssuesForUser({
      userId,
      jql: `project = ${normalizedProjectKey} ORDER BY updated DESC`,
      maxResults: 20,
    });

    return { success: true, message: "Pobrano tickety Jira.", issues };
  } catch (error) {
    console.error("getJiraIssuesByProject:", error);
    return { success: false, message: "Błąd pobierania ticketów Jira.", issues: [] };
  }
}

export async function syncJiraNow() {
  try {
    const userId = await getCurrentUserIdOrThrow();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { jiraSelectedProjectKey: true },
    });

    if (!user?.jiraSelectedProjectKey) {
      return { success: false, message: "Najpierw wybierz projekt Jira.", syncedCount: 0 };
    }

    const result = await getJiraIssuesByProject(user.jiraSelectedProjectKey);
    if (!result.success) {
      return { success: false, message: result.message, syncedCount: 0 };
    }

    return {
      success: true,
      message: `Synchronizacja Jira zakończona. Pobrano ${result.issues.length} ticketów.`,
      syncedCount: result.issues.length,
      issues: result.issues,
    };
  } catch (error) {
    console.error("syncJiraNow:", error);
    return { success: false, message: "Błąd synchronizacji Jira.", syncedCount: 0, issues: [] };
  }
}
