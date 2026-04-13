import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const Roles = Object.freeze({
  ADMIN: "ADMIN",
  KREATOR: "KREATOR",
  UCZESTNIK: "UCZESTNIK",
});

export async function getUserContext() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;
  const role = session?.user?.role ?? null;
  return { session, userId, role };
}

export function isAdminRole(role) {
  return role === Roles.ADMIN;
}

export async function requireAuth() {
  const ctx = await getUserContext();
  if (!ctx.userId || !ctx.role) {
    return { ok: false, error: "Brak autoryzacji. Zaloguj się ponownie.", ...ctx };
  }
  return { ok: true, ...ctx };
}

export async function requireRole(allowedRoles) {
  const auth = await requireAuth();
  if (!auth.ok) return auth;
  const allowed = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  if (!allowed.includes(auth.role)) {
    return { ok: false, error: "Brak uprawnień.", ...auth };
  }
  return auth;
}

export async function requireCreatorOrAdmin() {
  return requireRole([Roles.KREATOR, Roles.ADMIN]);
}

export async function requireStudentOrAdmin() {
  return requireRole([Roles.UCZESTNIK, Roles.ADMIN]);
}

export async function canAccessLead(lead) {
  const auth = await requireAuth();
  if (!auth.ok) return { ok: false, error: auth.error };
  if (!lead) return { ok: false, error: "Lead nie istnieje." };

  if (isAdminRole(auth.role)) return { ok: true, ...auth };

  if (auth.role === Roles.KREATOR) {
    return lead.ownerId === auth.userId
      ? { ok: true, ...auth }
      : { ok: false, error: "Brak dostępu do tego leada.", ...auth };
  }

  if (auth.role === Roles.UCZESTNIK) {
    const email = auth.session?.user?.email ?? null;
    return email && lead.email === email
      ? { ok: true, ...auth }
      : { ok: false, error: "Brak dostępu do tej skrzynki.", ...auth };
  }

  return { ok: false, error: "Brak uprawnień.", ...auth };
}

