"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireCreator } from "@/lib/rbac";

function hasFunnelModels() {
  return Boolean(
    prisma?.funnel &&
      prisma?.funnelStep &&
      (prisma?.aBTest || prisma?.abTest) &&
      (prisma?.aBVariant || prisma?.abVariant)
  );
}

function assertFunnelModelsAvailable() {
  if (hasFunnelModels()) return;
  throw new Error(
    "Modele lejkow nie sa jeszcze dostepne w Prisma Client. Uruchom: npx prisma db push (lub migrate dev) oraz npx prisma generate."
  );
}

const FUNNEL_INCLUDE = {
  steps: {
    orderBy: { order: "asc" },
    include: {
      landingPage: true,
      abTests: {
        orderBy: { createdAt: "desc" },
        include: {
          variants: {
            orderBy: { name: "asc" },
            include: { landingPage: true },
          },
        },
      },
    },
  },
};

function normalizeVariantWeights(variants) {
  if (!Array.isArray(variants) || variants.length < 2) {
    throw new Error("Test A/B wymaga minimum 2 wariantow.");
  }

  const sanitized = variants.map((variant) => ({
    ...variant,
    trafficWeight: Number(variant.trafficWeight ?? 0),
  }));

  const totalWeight = sanitized.reduce(
    (sum, variant) => sum + Math.max(0, variant.trafficWeight),
    0
  );

  if (totalWeight <= 0) {
    throw new Error("Suma trafficWeight musi byc wieksza od 0.");
  }

  return sanitized.map((variant) => ({
    name: variant.name,
    landingPageId: variant.landingPageId,
    trafficWeight: Math.round(
      (Math.max(0, variant.trafficWeight) / totalWeight) * 100
    ),
  }));
}

export async function getFunnelsWithDetails() {
  if (!hasFunnelModels()) return [];
  const auth = await requireCreator();
  if (!auth.ok) return [];

  return prisma.funnel.findMany({
    where: { ownerId: auth.userId },
    orderBy: { createdAt: "desc" },
    include: FUNNEL_INCLUDE,
  });
}

export async function getFunnelById(funnelId) {
  if (!funnelId) return null;
  if (!hasFunnelModels()) return null;
  const auth = await requireCreator();
  if (!auth.ok) return null;

  return prisma.funnel.findFirst({
    where: { id: funnelId, ownerId: auth.userId },
    include: FUNNEL_INCLUDE,
  });
}

export async function getLandingPagesForVariants() {
  return prisma.landingPage.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, slug: true },
  });
}

export async function createFunnel(formData) {
  assertFunnelModelsAvailable();
  const auth = await requireCreator();
  if (!auth.ok) throw new Error(auth.error);

  const name = String(formData.get("name") || "").trim();
  const slug = String(formData.get("slug") || "").trim();
  const status = String(formData.get("status") || "DRAFT");

  if (!name || !slug) {
    throw new Error("Nazwa i slug sa wymagane.");
  }

  await prisma.funnel.create({
    data: { name, slug, status, ownerId: auth.userId },
  });

  revalidatePath("/dashboard/lejki");
}

export async function updateFunnel(formData) {
  assertFunnelModelsAvailable();
  const auth = await requireCreator();
  if (!auth.ok) throw new Error(auth.error);

  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const slug = String(formData.get("slug") || "").trim();
  const status = String(formData.get("status") || "DRAFT");

  if (!id || !name || !slug) {
    throw new Error("Brakuje wymaganych danych lejka.");
  }

  const updated = await prisma.funnel.updateMany({
    where: { id, ownerId: auth.userId },
    data: { name, slug, status },
  });

  if (updated.count === 0) {
    throw new Error("Lejek nie istnieje lub nie masz do niego dostepu.");
  }

  revalidatePath("/dashboard/lejki");
  revalidatePath(`/dashboard/lejki/${id}`);
}

export async function deleteFunnel(formData) {
  assertFunnelModelsAvailable();
  const auth = await requireCreator();
  if (!auth.ok) throw new Error(auth.error);

  const id = String(formData.get("id") || "");
  if (!id) throw new Error("Brak id lejka.");

  const deleted = await prisma.funnel.deleteMany({
    where: { id, ownerId: auth.userId },
  });
  if (deleted.count === 0) {
    throw new Error("Lejek nie istnieje lub nie masz do niego dostepu.");
  }
  revalidatePath("/dashboard/lejki");
}

export async function addFunnelStep(formData) {
  assertFunnelModelsAvailable();
  const auth = await requireCreator();
  if (!auth.ok) throw new Error(auth.error);

  const funnelId = String(formData.get("funnelId") || "");
  const name = String(formData.get("name") || "").trim();
  const slug = String(formData.get("slug") || "").trim();
  const stepType = String(formData.get("stepType") || "LANDING");
  const landingPageId = String(formData.get("landingPageId") || "").trim();
  const orderFromForm = Number(formData.get("order"));

  if (!funnelId || !name || !slug) {
    throw new Error("Brakuje wymaganych danych kroku.");
  }

  const funnel = await prisma.funnel.findFirst({
    where: { id: funnelId, ownerId: auth.userId },
    select: { id: true },
  });
  if (!funnel) {
    throw new Error("Lejek nie istnieje lub nie masz do niego dostepu.");
  }

  const existingSteps = await prisma.funnelStep.findMany({
    where: { funnelId },
    orderBy: { order: "asc" },
    select: { id: true, order: true },
  });

  const nextOrder = Number.isFinite(orderFromForm)
    ? Math.max(1, Math.trunc(orderFromForm))
    : existingSteps.length + 1;

  await prisma.$transaction(async (tx) => {
    await tx.funnelStep.updateMany({
      where: { funnelId, order: { gte: nextOrder } },
      data: { order: { increment: 1 } },
    });

    await tx.funnelStep.create({
      data: {
        funnelId,
        name,
        slug,
        stepType,
        order: nextOrder,
        landingPageId: landingPageId || null,
      },
    });
  });

  revalidatePath(`/dashboard/lejki/${funnelId}`);
}

export async function reorderFunnelSteps(funnelId, orderedStepIds) {
  assertFunnelModelsAvailable();
  const auth = await requireCreator();
  if (!auth.ok) throw new Error(auth.error);

  if (!funnelId || !Array.isArray(orderedStepIds) || orderedStepIds.length === 0) {
    throw new Error("Brakuje danych do zmiany kolejnosci krokow.");
  }

  const funnel = await prisma.funnel.findFirst({
    where: { id: funnelId, ownerId: auth.userId },
    select: { id: true },
  });
  if (!funnel) {
    throw new Error("Lejek nie istnieje lub nie masz do niego dostepu.");
  }

  await prisma.$transaction(
    orderedStepIds.map((stepId, index) =>
      prisma.funnelStep.update({
        where: { id: stepId },
        data: { order: index + 1 },
      })
    )
  );

  revalidatePath(`/dashboard/lejki/${funnelId}`);
}

async function moveFunnelStep(formData, direction) {
  assertFunnelModelsAvailable();
  const auth = await requireCreator();
  if (!auth.ok) throw new Error(auth.error);

  const funnelId = String(formData.get("funnelId") || "");
  const stepId = String(formData.get("stepId") || "");

  if (!funnelId || !stepId) {
    throw new Error("Brakuje danych do zmiany kolejnosci.");
  }

  const funnel = await prisma.funnel.findFirst({
    where: { id: funnelId, ownerId: auth.userId },
    select: { id: true },
  });
  if (!funnel) {
    throw new Error("Lejek nie istnieje lub nie masz do niego dostepu.");
  }

  await prisma.$transaction(async (tx) => {
    const currentStep = await tx.funnelStep.findUnique({
      where: { id: stepId },
      select: { id: true, order: true, funnelId: true },
    });

    if (!currentStep) return;

    const targetOrder =
      direction === "up" ? currentStep.order - 1 : currentStep.order + 1;

    if (targetOrder < 1) return;

    const neighbor = await tx.funnelStep.findFirst({
      where: { funnelId: currentStep.funnelId, order: targetOrder },
      select: { id: true, order: true },
    });

    if (!neighbor) return;

    await tx.funnelStep.update({
      where: { id: currentStep.id },
      data: { order: neighbor.order },
    });

    await tx.funnelStep.update({
      where: { id: neighbor.id },
      data: { order: currentStep.order },
    });
  });

  revalidatePath(`/dashboard/lejki/${funnelId}`);
}

export async function moveFunnelStepUp(formData) {
  return moveFunnelStep(formData, "up");
}

export async function moveFunnelStepDown(formData) {
  return moveFunnelStep(formData, "down");
}

export async function createABTestForStep(formData) {
  assertFunnelModelsAvailable();
  const auth = await requireCreator();
  if (!auth.ok) throw new Error(auth.error);

  const funnelId = String(formData.get("funnelId") || "");
  const funnelStepId = String(formData.get("funnelStepId") || "");
  const name = String(formData.get("name") || "").trim();
  const status = String(formData.get("status") || "DRAFT");
  const startsAtRaw = String(formData.get("startsAt") || "").trim();
  const endsAtRaw = String(formData.get("endsAt") || "").trim();

  const variantAId = String(formData.get("variantALandingPageId") || "");
  const variantBId = String(formData.get("variantBLandingPageId") || "");
  const variantAWeight = Number(formData.get("variantAWeight") || 50);
  const variantBWeight = Number(formData.get("variantBWeight") || 50);

  if (!funnelStepId || !name || !variantAId || !variantBId) {
    throw new Error("Brakuje wymaganych danych testu A/B.");
  }

  const step = await prisma.funnelStep.findFirst({
    where: { id: funnelStepId, funnel: { ownerId: auth.userId } },
    select: { id: true },
  });
  if (!step) {
    throw new Error("Krok lejka nie istnieje lub nie masz do niego dostepu.");
  }

  const variants = normalizeVariantWeights([
    { name: "A", landingPageId: variantAId, trafficWeight: variantAWeight },
    { name: "B", landingPageId: variantBId, trafficWeight: variantBWeight },
  ]);

  const abTestDelegate = prisma.aBTest ?? prisma.abTest;

  await abTestDelegate.create({
    data: {
      funnelStepId,
      name,
      status,
      startsAt: startsAtRaw ? new Date(startsAtRaw) : null,
      endsAt: endsAtRaw ? new Date(endsAtRaw) : null,
      variants: {
        create: variants,
      },
    },
  });

  revalidatePath(`/dashboard/lejki/${funnelId}`);
}
