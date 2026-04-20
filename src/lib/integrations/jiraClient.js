import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret } from "@/lib/integrations/tokenCrypto";

const PROVIDER = "JIRA";
const DEFAULT_SCOPES = "read:jira-work read:jira-user offline_access";

export function getJiraOAuthConfig() {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  return {
    clientId: process.env.JIRA_OAUTH_CLIENT_ID || process.env.ATLASSIAN_CLIENT_ID,
    clientSecret: process.env.JIRA_OAUTH_CLIENT_SECRET || process.env.ATLASSIAN_CLIENT_SECRET,
    redirectUri:
      process.env.JIRA_OAUTH_REDIRECT_URI ||
      `${baseUrl}/api/integrations/jira/callback`,
    scopes: process.env.JIRA_OAUTH_SCOPES || DEFAULT_SCOPES,
  };
}

export async function getJiraIntegrationForUser(userId) {
  return prisma.oAuthIntegration.findUnique({
    where: {
      ownerId_provider: {
        ownerId: userId,
        provider: PROVIDER,
      },
    },
  });
}

async function refreshJiraAccessToken(integration) {
  if (!integration?.encryptedRefreshToken) {
    throw new Error("Brak refresh token Jira.");
  }
  const config = getJiraOAuthConfig();
  if (!config.clientId || !config.clientSecret) {
    throw new Error("Brak konfiguracji JIRA_OAUTH_CLIENT_ID/SECRET.");
  }

  const refreshToken = decryptSecret(integration.encryptedRefreshToken);
  const response = await fetch("https://auth.atlassian.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    const revoked = text.includes("invalid_grant");
    await prisma.oAuthIntegration.update({
      where: { id: integration.id },
      data: {
        status: revoked ? "REVOKED" : "ERROR",
        lastError: revoked
          ? "Dostęp Jira został cofnięty. Połącz integrację ponownie."
          : "Nie udało się odświeżyć tokenu Jira.",
      },
    });
    throw new Error("Jira refresh token flow failed.");
  }

  const refreshed = await response.json();
  const accessToken = refreshed?.access_token;
  if (!accessToken) {
    throw new Error("Jira refresh response missing access_token.");
  }

  const expiresIn = Number(refreshed?.expires_in || 3600);
  const accessTokenExpiresAt = new Date(Date.now() + expiresIn * 1000);
  const updated = await prisma.oAuthIntegration.update({
    where: { id: integration.id },
    data: {
      encryptedAccessToken: encryptSecret(accessToken),
      encryptedRefreshToken: refreshed?.refresh_token
        ? encryptSecret(refreshed.refresh_token)
        : integration.encryptedRefreshToken,
      accessTokenExpiresAt,
      scopes: refreshed?.scope || integration.scopes,
      status: "CONNECTED",
      lastError: null,
    },
    select: { encryptedAccessToken: true },
  });

  return decryptSecret(updated.encryptedAccessToken);
}

export async function getValidJiraAccessToken(userId) {
  const integration = await getJiraIntegrationForUser(userId);
  if (!integration || integration.status === "DISCONNECTED") {
    throw new Error("Brak aktywnej integracji Jira.");
  }
  if (!integration.encryptedAccessToken) {
    throw new Error("Brak tokenu dostępu Jira.");
  }
  const expiresAt = integration.accessTokenExpiresAt
    ? new Date(integration.accessTokenExpiresAt).getTime()
    : null;
  if (expiresAt && expiresAt - Date.now() <= 60 * 1000) {
    return refreshJiraAccessToken(integration);
  }
  return decryptSecret(integration.encryptedAccessToken);
}

export async function discoverJiraResource(accessToken) {
  const response = await fetch("https://api.atlassian.com/oauth/token/accessible-resources", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Jira resources error: ${response.status}`);
  }

  const resources = await response.json();
  if (!Array.isArray(resources)) return null;
  return (
    resources.find((resource) =>
      Array.isArray(resource?.scopes) ? resource.scopes.includes("read:jira-work") : false
    ) || resources[0] || null
  );
}

export async function fetchJiraIssuesForUser({
  userId,
  jql = "assignee = currentUser() ORDER BY updated DESC",
  maxResults = 25,
}) {
  const accessToken = await getValidJiraAccessToken(userId);
  const integration = await getJiraIntegrationForUser(userId);
  let cloudId = integration?.jiraCloudId || null;
  let siteUrl = integration?.jiraSiteUrl || null;

  if (!cloudId) {
    const resource = await discoverJiraResource(accessToken);
    cloudId = resource?.id || null;
    siteUrl = resource?.url || null;
    if (!cloudId) return [];
    await prisma.oAuthIntegration.update({
      where: { id: integration.id },
      data: { jiraCloudId: cloudId, jiraSiteUrl: siteUrl },
    });
  }

  const params = new URLSearchParams({
    jql,
    maxResults: String(maxResults),
    fields: "summary,status,updated",
  });

  const response = await fetch(
    `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/search?${params.toString()}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(`Jira search error: ${response.status}`);
  }

  const data = await response.json();
  const issues = Array.isArray(data?.issues) ? data.issues : [];
  return issues.map((issue) => ({
    id: issue.id,
    key: issue.key,
    summary: issue?.fields?.summary || "Brak tytułu",
    status: issue?.fields?.status?.name || "Unknown",
    updatedAt: issue?.fields?.updated || null,
    url: siteUrl ? `${siteUrl}/browse/${issue.key}` : null,
  }));
}

export async function saveJiraOAuthConnection(userId, payload) {
  const existing = await getJiraIntegrationForUser(userId);
  const expiresIn = Number(payload?.expires_in || 3600);
  const accessTokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

  return prisma.oAuthIntegration.upsert({
    where: {
      ownerId_provider: {
        ownerId: userId,
        provider: PROVIDER,
      },
    },
    update: {
      scopes: payload?.scope || existing?.scopes || DEFAULT_SCOPES,
      encryptedAccessToken: encryptSecret(payload.access_token),
      encryptedRefreshToken: payload?.refresh_token
        ? encryptSecret(payload.refresh_token)
        : existing?.encryptedRefreshToken || null,
      accessTokenExpiresAt,
      status: "CONNECTED",
      lastError: null,
    },
    create: {
      ownerId: userId,
      provider: PROVIDER,
      scopes: payload?.scope || DEFAULT_SCOPES,
      encryptedAccessToken: encryptSecret(payload.access_token),
      encryptedRefreshToken: payload?.refresh_token
        ? encryptSecret(payload.refresh_token)
        : null,
      accessTokenExpiresAt,
      status: "CONNECTED",
      lastError: null,
    },
  });
}

