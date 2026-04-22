import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-auth/next", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

import { getServerSession } from "next-auth/next";
import {
  requireLeadOwnership,
  canAccessLead,
  requireUser,
  requireCreator,
  Roles,
} from "./rbac";

function mockSession(user) {
  getServerSession.mockResolvedValue(user ? { user } : null);
}

const KREATOR_A = { id: "kreator-a-id", role: Roles.KREATOR, email: "a@test.pl" };
const KREATOR_B = { id: "kreator-b-id", role: Roles.KREATOR, email: "b@test.pl" };
const ADMIN = { id: "admin-id", role: Roles.ADMIN, email: "admin@test.pl" };
const UCZESTNIK = { id: "ucz-id", role: Roles.UCZESTNIK, email: "student@test.pl" };

describe("requireUser", () => {
  beforeEach(() => vi.clearAllMocks());

  it("zwraca ok:false gdy brak sesji", async () => {
    mockSession(null);
    const result = await requireUser();
    expect(result.ok).toBe(false);
  });

  it("zwraca ok:true dla zalogowanego użytkownika", async () => {
    mockSession(KREATOR_A);
    const result = await requireUser();
    expect(result.ok).toBe(true);
    expect(result.userId).toBe(KREATOR_A.id);
  });
});

describe("requireCreator", () => {
  beforeEach(() => vi.clearAllMocks());

  it("odrzuca UCZESTNIK", async () => {
    mockSession(UCZESTNIK);
    const result = await requireCreator();
    expect(result.ok).toBe(false);
  });

  it("akceptuje KREATOR", async () => {
    mockSession(KREATOR_A);
    const result = await requireCreator();
    expect(result.ok).toBe(true);
  });

  it("akceptuje ADMIN", async () => {
    mockSession(ADMIN);
    const result = await requireCreator();
    expect(result.ok).toBe(true);
  });
});

describe("requireLeadOwnership — izolacja multi-user", () => {
  let mockPrisma;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = {
      lead: {
        findFirst: vi.fn(),
      },
    };
  });

  it("odrzuca niezalogowanego użytkownika", async () => {
    mockSession(null);
    const result = await requireLeadOwnership(mockPrisma, "lead-1");
    expect(result.ok).toBe(false);
    expect(mockPrisma.lead.findFirst).not.toHaveBeenCalled();
  });

  it("odrzuca uczestnika (wymaga KREATOR lub ADMIN)", async () => {
    mockSession(UCZESTNIK);
    const result = await requireLeadOwnership(mockPrisma, "lead-1");
    expect(result.ok).toBe(false);
    expect(mockPrisma.lead.findFirst).not.toHaveBeenCalled();
  });

  it("kreator A widzi swój lead", async () => {
    mockSession(KREATOR_A);
    mockPrisma.lead.findFirst.mockResolvedValue({
      id: "lead-1",
      ownerId: KREATOR_A.id,
      email: "client@x.pl",
    });

    const result = await requireLeadOwnership(mockPrisma, "lead-1");
    expect(result.ok).toBe(true);
    expect(result.lead.id).toBe("lead-1");

    expect(mockPrisma.lead.findFirst).toHaveBeenCalledWith({
      where: { id: "lead-1", ownerId: KREATOR_A.id },
      select: { id: true, ownerId: true, email: true },
    });
  });

  it("kreator B NIE widzi leada kreatora A", async () => {
    mockSession(KREATOR_B);
    mockPrisma.lead.findFirst.mockResolvedValue(null);

    const result = await requireLeadOwnership(mockPrisma, "lead-1");
    expect(result.ok).toBe(false);

    expect(mockPrisma.lead.findFirst).toHaveBeenCalledWith({
      where: { id: "lead-1", ownerId: KREATOR_B.id },
      select: { id: true, ownerId: true, email: true },
    });
  });

  it("admin widzi lead dowolnego kreatora (brak filtra ownerId)", async () => {
    mockSession(ADMIN);
    mockPrisma.lead.findFirst.mockResolvedValue({
      id: "lead-1",
      ownerId: KREATOR_A.id,
      email: "client@x.pl",
    });

    const result = await requireLeadOwnership(mockPrisma, "lead-1");
    expect(result.ok).toBe(true);

    expect(mockPrisma.lead.findFirst).toHaveBeenCalledWith({
      where: { id: "lead-1" },
      select: { id: true, ownerId: true, email: true },
    });
  });

  it("odrzuca nieprawidłowe leadId", async () => {
    mockSession(KREATOR_A);
    const r1 = await requireLeadOwnership(mockPrisma, "");
    expect(r1.ok).toBe(false);

    const r2 = await requireLeadOwnership(mockPrisma, null);
    expect(r2.ok).toBe(false);

    const r3 = await requireLeadOwnership(mockPrisma, 123);
    expect(r3.ok).toBe(false);

    expect(mockPrisma.lead.findFirst).not.toHaveBeenCalled();
  });
});

describe("canAccessLead — izolacja multi-user", () => {
  beforeEach(() => vi.clearAllMocks());

  const leadA = { id: "lead-1", ownerId: KREATOR_A.id, email: "client@x.pl" };

  it("kreator A ma dostęp do swojego leada", async () => {
    mockSession(KREATOR_A);
    const result = await canAccessLead(leadA);
    expect(result.ok).toBe(true);
  });

  it("kreator B NIE ma dostępu do leada kreatora A", async () => {
    mockSession(KREATOR_B);
    const result = await canAccessLead(leadA);
    expect(result.ok).toBe(false);
  });

  it("admin ma dostęp do każdego leada", async () => {
    mockSession(ADMIN);
    const result = await canAccessLead(leadA);
    expect(result.ok).toBe(true);
  });

  it("uczestnik z pasującym emailem widzi lead", async () => {
    const studentLead = { id: "lead-s", ownerId: KREATOR_A.id, email: UCZESTNIK.email };
    mockSession(UCZESTNIK);
    const result = await canAccessLead(studentLead);
    expect(result.ok).toBe(true);
  });

  it("uczestnik z innym emailem NIE widzi leada", async () => {
    mockSession(UCZESTNIK);
    const result = await canAccessLead(leadA);
    expect(result.ok).toBe(false);
  });

  it("odrzuca null lead", async () => {
    mockSession(KREATOR_A);
    const result = await canAccessLead(null);
    expect(result.ok).toBe(false);
  });
});

describe("Scenariusz multi-user: dwóch kreatorów, izolacja wątków", () => {
  let mockPrisma;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = {
      lead: {
        findFirst: vi.fn(),
      },
    };
  });

  it("kreator A i B mają oddzielne leady — wzajemny dostęp zablokowany", async () => {
    const leadOfA = { id: "lead-a", ownerId: KREATOR_A.id, email: "clientA@x.pl" };
    const leadOfB = { id: "lead-b", ownerId: KREATOR_B.id, email: "clientB@x.pl" };

    mockPrisma.lead.findFirst.mockImplementation(({ where }) => {
      if (where.id === "lead-a" && where.ownerId === KREATOR_A.id) return leadOfA;
      if (where.id === "lead-b" && where.ownerId === KREATOR_B.id) return leadOfB;
      return null;
    });

    mockSession(KREATOR_A);
    const aOwn = await requireLeadOwnership(mockPrisma, "lead-a");
    expect(aOwn.ok).toBe(true);

    mockSession(KREATOR_A);
    const aForeign = await requireLeadOwnership(mockPrisma, "lead-b");
    expect(aForeign.ok).toBe(false);

    mockSession(KREATOR_B);
    const bOwn = await requireLeadOwnership(mockPrisma, "lead-b");
    expect(bOwn.ok).toBe(true);

    mockSession(KREATOR_B);
    const bForeign = await requireLeadOwnership(mockPrisma, "lead-a");
    expect(bForeign.ok).toBe(false);
  });

  it("admin widzi leady obu kreatorów", async () => {
    mockPrisma.lead.findFirst.mockImplementation(({ where }) => {
      if (where.id === "lead-a" && !where.ownerId)
        return { id: "lead-a", ownerId: KREATOR_A.id, email: "a@x.pl" };
      if (where.id === "lead-b" && !where.ownerId)
        return { id: "lead-b", ownerId: KREATOR_B.id, email: "b@x.pl" };
      return null;
    });

    mockSession(ADMIN);
    const adminA = await requireLeadOwnership(mockPrisma, "lead-a");
    expect(adminA.ok).toBe(true);

    mockSession(ADMIN);
    const adminB = await requireLeadOwnership(mockPrisma, "lead-b");
    expect(adminB.ok).toBe(true);
  });
});
