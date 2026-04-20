import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret } from "@/lib/integrations/tokenCrypto";

const PROVIDER = "GOOGLE";
const DEFAULT_SCOPES =
  "openid email profile https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/contacts.readonly";

const REQUIRED_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/contacts.readonly",
];

function normalizeScopes(scopesValue) {
  const raw = typeof scopesValue === "string" ? scopesValue : "";
  const scopes = new Set(raw.split(/\s+/).map((s) => s.trim()).filter(Boolean));
  REQUIRED_SCOPES.forEach((scope) => scopes.add(scope));
  return Array.from(scopes).join(" ");
}

function getDefaultGoogleCallbackUrl() {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  return `${baseUrl}/api/integrations/google/callback`;
}

function normalizeGoogleRedirectUri(value) {
  if (typeof value !== "string" || value.trim().length < 1) {
    return getDefaultGoogleCallbackUrl();
  }

  const normalized = value.trim();
  const isExpectedPath = normalized.includes("/api/integrations/google/callback");
  return isExpectedPath ? normalized : getDefaultGoogleCallbackUrl();
}

function getGoogleOAuthConfig() {
  return {
    clientId: process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: normalizeGoogleRedirectUri(process.env.GOOGLE_OAUTH_REDIRECT_URI),
    scopes: normalizeScopes(process.env.GOOGLE_OAUTH_SCOPES || DEFAULT_SCOPES),
  };
}

async function updateIntegrationStatus(id, data) {
  return prisma.oAuthIntegration.update({
    where: { id },
    data,
  });
}

export async function getGoogleIntegrationForUser(userId) {
  return prisma.oAuthIntegration.findUnique({
    where: {
      ownerId_provider: {
        ownerId: userId,
        provider: PROVIDER,
      },
    },
  });
}

export async function getValidGoogleAccessToken(userId) {
  const integration = await getGoogleIntegrationForUser(userId);
  if (!integration || integration.status === "DISCONNECTED") {
    throw new Error("Brak aktywnej integracji Google.");
  }

  if (!integration.encryptedAccessToken) {
    throw new Error("Brak tokenu dostępu Google.");
  }

  const now = Date.now();
  const expiresAt = integration.accessTokenExpiresAt
    ? new Date(integration.accessTokenExpiresAt).getTime()
    : null;

  if (expiresAt && expiresAt - now > 60 * 1000) {
    return decryptSecret(integration.encryptedAccessToken);
  }

  if (!integration.encryptedRefreshToken) {
    await updateIntegrationStatus(integration.id, {
      status: "ERROR",
      lastError: "Brak refresh token. Połącz integrację Google ponownie.",
    });
    throw new Error("Brak refresh token dla Google.");
  }

  const config = getGoogleOAuthConfig();
  if (!config.clientId || !config.clientSecret) {
    throw new Error("Brak konfiguracji GOOGLE_OAUTH_CLIENT_ID/SECRET.");
  }

  const refreshToken = decryptSecret(integration.encryptedRefreshToken);
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    const revoked = text.includes("invalid_grant");
    await updateIntegrationStatus(integration.id, {
      status: revoked ? "REVOKED" : "ERROR",
      lastError: revoked
        ? "Google cofnął dostęp do aplikacji. Połącz ponownie."
        : "Nie udało się odświeżyć tokenu Google.",
    });
    throw new Error("Google refresh token flow failed.");
  }

  const refreshed = await response.json();
  const nextAccessToken = refreshed?.access_token;
  if (!nextAccessToken) {
    throw new Error("Google refresh response missing access_token.");
  }

  const expiresIn = Number(refreshed?.expires_in || 3600);
  const accessTokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

  const updated = await prisma.oAuthIntegration.update({
    where: { id: integration.id },
    data: {
      encryptedAccessToken: encryptSecret(nextAccessToken),
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

export async function fetchGoogleCalendarEvents(userId, rangeStart, rangeEnd) {
  const accessToken = await getValidGoogleAccessToken(userId);
  const params = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "100",
    timeMin: rangeStart.toISOString(),
    timeMax: rangeEnd.toISOString(),
  });

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
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
    let details = "";
    try {
      const text = await response.text();
      details = text ? ` - ${text.slice(0, 500)}` : "";
    } catch {
      details = "";
    }
    throw new Error(`Google Calendar API error: ${response.status}${details}`);
  }

  const body = await response.json();
  const items = Array.isArray(body?.items) ? body.items : [];
  return items.map((event) => ({
    id: `google-${event.id}`,
    title: event.summary || "Bez tytułu",
    start: event?.start?.dateTime || event?.start?.date || null,
    end: event?.end?.dateTime || event?.end?.date || null,
    source: "google",
    externalUrl: event?.htmlLink || null,
  }));
}

export async function fetchGoogleCalendarPreview(userId) {
  const start = new Date();
  const end = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const events = await fetchGoogleCalendarEvents(userId, start, end);
  return events.slice(0, 10);
}

export async function fetchGoogleContacts(userId) {
  const accessToken = await getValidGoogleAccessToken(userId);
  const params = new URLSearchParams({
    pageSize: "200",
    personFields: "names,emailAddresses,phoneNumbers",
    sortOrder: "LAST_MODIFIED_ASCENDING",
  });

  const response = await fetch(
    `https://people.googleapis.com/v1/people/me/connections?${params.toString()}`,
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
    throw new Error(`Google People API error: ${response.status}`);
  }

  const body = await response.json();
  const connections = Array.isArray(body?.connections) ? body.connections : [];
  return connections
    .map((person) => {
      const email = person?.emailAddresses?.[0]?.value?.trim()?.toLowerCase() || null;
      if (!email) return null;
      const fullName = person?.names?.[0]?.displayName || "";
      const [firstName, ...rest] = fullName.split(" ").filter(Boolean);
      const lastName = rest.join(" ") || null;
      const phone = person?.phoneNumbers?.[0]?.value || null;
      return {
        externalId: person?.resourceName || null,
        email,
        firstName: firstName || email.split("@")[0] || "Kontakt",
        lastName,
        phone,
      };
    })
    .filter(Boolean);
}

export async function saveGoogleOAuthConnection(userId, payload) {
  const existing = await getGoogleIntegrationForUser(userId);
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
      externalAccountId: payload?.externalAccountId || existing?.externalAccountId || null,
      externalEmail: payload?.externalEmail || existing?.externalEmail || null,
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
      externalAccountId: payload?.externalAccountId || null,
      externalEmail: payload?.externalEmail || null,
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

export { getGoogleOAuthConfig };

