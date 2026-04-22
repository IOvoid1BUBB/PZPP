"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireCreator, getUserContext, isAdminRole } from "@/lib/rbac";

async function requireCreatorOrDevFallback() {
  const auth = await requireCreator();
  if (!auth.ok) return auth;
  return { ok: true, session: auth.session, userId: auth.userId, role: auth.role };
}

function slugify(input) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function isValidSlug(slug) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

async function requireLandingOwnership(landingId, authorId) {
  const landing = await prisma.landingPage.findUnique({
    where: { id: landingId },
    select: { id: true, authorId: true },
  });
  if (!landing) return { ok: false, error: "Nie znaleziono Landing Page'a." };
  // Legacy rows created before authorId existed can be "claimed" on first edit.
  if (landing.authorId && landing.authorId !== authorId)
    return { ok: false, error: "Brak uprawnień do tej strony." };
  return { ok: true, landing };
}

export async function saveLandingPage(data) {
  try {
    const auth = await requireCreatorOrDevFallback();
    if (!auth.ok) return { success: false, error: auth.error };

    const { id, title, slug, htmlData, cssData, isActive, isPublic } = data || {};
    const authorId = auth.userId;

    if (id) {
      if (!isAdminRole(auth.role)) {
        const own = await requireLandingOwnership(id, authorId);
        if (!own.ok) return { success: false, error: own.error };
      }
    }

    const normalizedTitle = String(title || "").trim() || "Nowa Kampania";
    const proposedSlug = slugify(slug || normalizedTitle || `landing-${Date.now()}`);
    const finalSlug = proposedSlug || `landing-${Date.now()}`;

    if (!isValidSlug(finalSlug)) {
      return {
        success: false,
        error:
          "Nieprawidłowy slug. Użyj małych liter, cyfr i myślników (np. moj-super-landing).",
      };
    }

    const existingSlug = await prisma.landingPage.findUnique({
      where: { slug: finalSlug },
      select: { id: true, authorId: true },
    });

    if (existingSlug && existingSlug.id !== id) {
      return { success: false, error: "Ten slug jest już zajęty." };
    }

    const page = id
      ? await prisma.landingPage.update({
          where: { id },
          data: {
            title: normalizedTitle,
            slug: finalSlug,
            htmlData: typeof htmlData === "string" ? htmlData : null,
            cssData: typeof cssData === "string" ? cssData : null,
            isActive: typeof isActive === "boolean" ? isActive : undefined,
            isPublic: typeof isPublic === "boolean" ? isPublic : undefined,
            ...(isAdminRole(auth.role) ? {} : { authorId: authorId }), // claim legacy rows for owner edits
          },
          select: { id: true, slug: true, title: true, isActive: true, isPublic: true, updatedAt: true },
        })
      : await prisma.landingPage.create({
          data: {
            title: normalizedTitle,
            slug: finalSlug,
            htmlData: typeof htmlData === "string" ? htmlData : null,
            cssData: typeof cssData === "string" ? cssData : null,
            isActive: typeof isActive === "boolean" ? isActive : false,
            isPublic: typeof isPublic === "boolean" ? isPublic : false,
            authorId: isAdminRole(auth.role) ? authorId : authorId,
          },
          select: { id: true, slug: true, title: true, isActive: true, isPublic: true, updatedAt: true },
        });

    revalidatePath("/dashboard/pagebuilder");
    return {
      success: true,
      page: {
        ...page,
        updatedAt: page.updatedAt?.toISOString?.() ?? null,
      },
    };
  } catch (error) {
    console.error("Błąd zapisu strony:", error);
    return { success: false, error: "Nie udało się zapisać Landing Page'a." };
  }
}

export async function listLandingPages() {
  try {
    const auth = await requireCreatorOrDevFallback();
    if (!auth.ok) return [];
    const authorId = auth.userId;

    const pages = await prisma.landingPage.findMany({
      where: isAdminRole(auth.role) ? {} : { OR: [{ authorId }, { authorId: null }] },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return pages.map((p) => ({
      ...p,
      createdAt: p.createdAt?.toISOString?.() ?? null,
      updatedAt: p.updatedAt?.toISOString?.() ?? null,
    }));
  } catch (error) {
    console.error("listLandingPages:", error);
    return [];
  }
}

export async function getLandingPageForEditor(landingId) {
  try {
    const auth = await requireCreatorOrDevFallback();
    if (!auth.ok) return { success: false, error: auth.error };
    if (!landingId || typeof landingId !== "string") {
      return { success: false, error: "Nieprawidłowe ID landing page." };
    }
    const authorId = auth.userId;
    if (!isAdminRole(auth.role)) {
      const own = await requireLandingOwnership(landingId, authorId);
      if (!own.ok) return { success: false, error: own.error };
    }

    const landing = await prisma.landingPage.findUnique({
      where: { id: landingId },
      select: {
        id: true,
        title: true,
        slug: true,
        htmlData: true,
        cssData: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      success: true,
      landing: landing
        ? {
            ...landing,
            createdAt: landing.createdAt?.toISOString?.() ?? null,
            updatedAt: landing.updatedAt?.toISOString?.() ?? null,
          }
        : null,
    };
  } catch (error) {
    console.error("getLandingPageForEditor:", error);
    return { success: false, error: "Nie udało się pobrać landing page." };
  }
}

export async function createLandingPage() {
  try {
    const auth = await requireCreatorOrDevFallback();
    if (!auth.ok) return { success: false, error: auth.error };
    const authorId = auth.userId;

    const page = await prisma.landingPage.create({
      data: {
        title: "Nowa strona",
        slug: `landing-${Date.now()}`,
        htmlData: "<section style=\"padding: 32px;\"><h1>Nowy landing</h1><p>Zacznij budować swoją stronę.</p></section>",
        cssData: "",
        isActive: false,
        authorId,
      },
      select: { id: true, slug: true, title: true, isActive: true, createdAt: true },
    });

    revalidatePath("/dashboard/pagebuilder");
    return {
      success: true,
      page: {
        ...page,
        createdAt: page.createdAt?.toISOString?.() ?? null,
      },
    };
  } catch (error) {
    console.error("createLandingPage:", error);
    return { success: false, error: "Nie udało się utworzyć landing page." };
  }
}

export async function deleteLandingPage(landingId) {
  try {
    const auth = await requireCreatorOrDevFallback();
    if (!auth.ok) return { success: false, error: auth.error };
    if (!landingId || typeof landingId !== "string") {
      return { success: false, error: "Nieprawidłowe ID landing page." };
    }
    const authorId = auth.userId;
    if (!isAdminRole(auth.role)) {
      const own = await requireLandingOwnership(landingId, authorId);
      if (!own.ok) return { success: false, error: own.error };
    }

    await prisma.landingPage.delete({ where: { id: landingId } });
    revalidatePath("/dashboard/pagebuilder");
    return { success: true };
  } catch (error) {
    console.error("deleteLandingPage:", error);
    return { success: false, error: "Nie udało się usunąć landing page." };
  }
}

export async function setLandingPageActive(landingId, isActive) {
  try {
    const auth = await requireCreatorOrDevFallback();
    if (!auth.ok) return { success: false, error: auth.error };
    if (!landingId || typeof landingId !== "string") {
      return { success: false, error: "Nieprawidłowe ID landing page." };
    }

    const authorId = auth.userId;
    if (!isAdminRole(auth.role)) {
      const own = await requireLandingOwnership(landingId, authorId);
      if (!own.ok) return { success: false, error: own.error };
    }

    const page = await prisma.landingPage.update({
      where: { id: landingId },
      data: {
        isActive: Boolean(isActive),
        ...(isAdminRole(auth.role) ? {} : { authorId }), // claim legacy rows
      },
      select: { id: true, isActive: true, slug: true, updatedAt: true },
    });

    revalidatePath("/dashboard/pagebuilder");
    revalidatePath(`/${page.slug}`);
    return {
      success: true,
      page: {
        ...page,
        updatedAt: page.updatedAt?.toISOString?.() ?? null,
      },
    };
  } catch (error) {
    console.error("setLandingPageActive:", error);
    return { success: false, error: "Nie udało się zmienić statusu strony." };
  }
}

export async function checkLandingSlugAvailability(slug, landingId) {
  try {
    const auth = await requireCreatorOrDevFallback();
    if (!auth.ok) return { ok: false, available: false, error: auth.error };

    const normalized = slugify(slug);
    if (!normalized) return { ok: true, available: false, normalized };
    if (!isValidSlug(normalized)) {
      return {
        ok: true,
        available: false,
        normalized,
        error: "Slug może zawierać tylko małe litery, cyfry i myślniki.",
      };
    }

    const existing = await prisma.landingPage.findUnique({
      where: { slug: normalized },
      select: { id: true },
    });

    const available = !existing || existing.id === landingId;
    return { ok: true, available, normalized };
  } catch (error) {
    console.error("checkLandingSlugAvailability:", error);
    return { ok: false, available: false, error: "Nie udało się sprawdzić sluga." };
  }
}

export async function getLandingPageBySlug(slug) {
  try {
    const normalized = slugify(slug);
    if (!normalized) return null;

    const page = await prisma.landingPage.findUnique({
      where: { slug: normalized },
      select: {
        title: true,
        slug: true,
        htmlData: true,
        cssData: true,
        isActive: true,
        isPublic: true,
        authorId: true,
        updatedAt: true,
      },
    });

    if (!page) return null;

    // Publiczny widok: tylko gdy strona jest aktywna i publiczna
    if (page.isActive && page.isPublic) return page;

    // Prywatny widok: owner lub ADMIN (w tym podgląd draftów)
    const { userId, role } = await getUserContext();

    if (role === "ADMIN") return page;
    if (userId && page.authorId && page.authorId === userId) return page;

    return null;
  } catch (error) {
    console.error("Błąd pobierania Landing Page po slug:", error);
    return null;
  }
}