import { prisma } from "@/lib/prisma";

const REFRESH_BUFFER_SECONDS = 60;

function isExpiredOrNearExpiry(expiresAt) {
  if (!expiresAt) return false;
  const nowInSeconds = Math.floor(Date.now() / 1000);
  return Number(expiresAt) <= nowInSeconds + REFRESH_BUFFER_SECONDS;
}

function getProviderRefreshConfig(provider) {
  if (provider === "google") {
    return {
      tokenUrl: "https://oauth2.googleapis.com/token",
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      extraParams: {},
    };
  }

  if (provider === "azure-ad") {
    const tenantId = process.env.AZURE_AD_TENANT_ID || "common";
    return {
      tokenUrl: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      clientId: process.env.AZURE_AD_CLIENT_ID,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
      extraParams: { scope: "offline_access openid profile email Mail.Read Calendars.Read" },
    };
  }

  if (provider === "atlassian") {
    return {
      tokenUrl: "https://auth.atlassian.com/oauth/token",
      clientId: process.env.ATLASSIAN_CLIENT_ID,
      clientSecret: process.env.ATLASSIAN_CLIENT_SECRET,
      extraParams: {},
    };
  }

  return null;
}

async function refreshOAuthAccessToken(account) {
  const providerConfig = getProviderRefreshConfig(account.provider);
  if (!providerConfig) {
    throw new Error(`Provider refresh not implemented: ${account.provider}`);
  }

  if (!providerConfig.clientId || !providerConfig.clientSecret) {
    throw new Error(`Missing OAuth credentials for provider: ${account.provider}`);
  }

  if (!account.refresh_token) {
    throw new Error(`Missing refresh token for provider: ${account.provider}`);
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: account.refresh_token,
    client_id: providerConfig.clientId,
    client_secret: providerConfig.clientSecret,
    ...providerConfig.extraParams,
  });

  const response = await fetch(providerConfig.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OAuth refresh failed (${account.provider}): ${response.status} ${text}`);
  }

  const tokenResponse = await response.json();
  const expiresIn = Number(tokenResponse?.expires_in || 3600);
  const nextExpiresAt = Math.floor(Date.now() / 1000) + expiresIn;

  const updated = await prisma.account.update({
    where: { id: account.id },
    data: {
      access_token: tokenResponse?.access_token || account.access_token,
      refresh_token: tokenResponse?.refresh_token || account.refresh_token,
      expires_at: nextExpiresAt,
      token_type: tokenResponse?.token_type || account.token_type,
      scope: tokenResponse?.scope || account.scope,
    },
    select: {
      id: true,
      provider: true,
      userId: true,
      access_token: true,
      refresh_token: true,
      expires_at: true,
      token_type: true,
      scope: true,
    },
  });

  return updated;
}

export async function getOAuthAccountOrThrow(userId, provider) {
  if (!userId) {
    throw new Error("Brak userId.");
  }

  const account = await prisma.account.findFirst({
    where: { userId, provider },
    select: {
      id: true,
      provider: true,
      userId: true,
      access_token: true,
      refresh_token: true,
      expires_at: true,
      token_type: true,
      scope: true,
    },
  });

  if (!account?.access_token) {
    throw new Error(`Brak podłączonej integracji OAuth dla: ${provider}.`);
  }

  if (isExpiredOrNearExpiry(account.expires_at)) {
    try {
      return await refreshOAuthAccessToken(account);
    } catch (error) {
      console.error("getOAuthAccountOrThrow refresh error:", {
        provider,
        userId,
        message: error instanceof Error ? error.message : String(error),
      });
      throw new Error(
        `Sesja OAuth wygasła dla ${provider}. Połącz integrację ponownie.`
      );
    }
  }

  return account;
}

