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
    return { ...ctx, ok: false, error: "Brak autoryzacji. Zaloguj się ponownie." };
  }
  return { ...ctx, ok: true };
}

export async function requireRole(allowedRoles) {
  const auth = await requireAuth();
  if (!auth.ok) return auth;
  const allowed = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  if (!allowed.includes(auth.role)) {
    return { ...auth, ok: false, error: "Brak uprawnień." };
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

  if (isAdminRole(auth.role)) return { ...auth, ok: true };

  if (auth.role === Roles.KREATOR) {
    return lead.ownerId === auth.userId
      ? { ...auth, ok: true }
      : { ...auth, ok: false, error: "Brak dostępu do tego leada." };
  }

  if (auth.role === Roles.UCZESTNIK) {
    const email = auth.session?.user?.email ?? null;
    return email && lead.email === email
      ? { ...auth, ok: true }
      : { ...auth, ok: false, error: "Brak dostępu do tej skrzynki." };
  }

  return { ...auth, ok: false, error: "Brak uprawnień." };
}

/**
 * Weryfikuje, że zalogowany kreator/admin jest właścicielem leada.
 * Zwraca { ok, lead, ...auth } lub { ok: false, error }.
 */
export async function requireLeadOwnership(prisma, leadId) {
  const auth = await requireCreatorOrAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  if (!leadId || typeof leadId !== "string") {
    return { ok: false, error: "Nieprawidłowe ID leada." };
  }

  const whereClause = isAdminRole(auth.role)
    ? { id: leadId }
    : { id: leadId, ownerId: auth.userId };

  const lead = await prisma.lead.findFirst({
    where: whereClause,
    select: { id: true, ownerId: true, email: true },
  });

  if (!lead) {
    return { ok: false, error: "Lead nie istnieje lub brak uprawnień." };
  }

  return { ok: true, lead, ...auth };
}

