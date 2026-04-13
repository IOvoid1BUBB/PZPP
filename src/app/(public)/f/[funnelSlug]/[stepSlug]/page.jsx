import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

function isTestActive(test) {
  if (test.status !== "ACTIVE") return false;
  const now = new Date();
  if (test.startsAt && now < test.startsAt) return false;
  if (test.endsAt && now > test.endsAt) return false;
  return true;
}

function hashString(input) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function pickVariantByWeight(variants, seedSource) {
  const total = variants.reduce((sum, variant) => sum + variant.trafficWeight, 0);
  if (total <= 0) return variants[0];

  const seed = hashString(seedSource) % total;
  let cursor = seed;
  for (const variant of variants) {
    cursor -= variant.trafficWeight;
    if (cursor <= 0) return variant;
  }
  return variants[variants.length - 1];
}

export default async function FunnelStepPublicPage({ params }) {
  const { funnelSlug, stepSlug } = params;
  const cookieStore = await cookies();

  const funnel = await prisma.funnel.findUnique({
    where: { slug: funnelSlug },
    include: {
      steps: {
        where: { slug: stepSlug },
        include: {
          landingPage: true,
          abTests: {
            include: {
              variants: {
                include: { landingPage: true },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  });

  if (!funnel || funnel.status !== "ACTIVE" || funnel.steps.length === 0) {
    notFound();
  }

  const step = funnel.steps[0];
  const activeTest = step.abTests.find(isTestActive);

  let selectedLanding = step.landingPage;

  if (activeTest && activeTest.variants.length > 0) {
    const visitorId = cookieStore.get("funnel_visitor_id")?.value ?? "anonymous";
    const selectedVariant = pickVariantByWeight(
      activeTest.variants,
      `${visitorId}:${activeTest.id}`
    );

    const abVariantDelegate = prisma.aBVariant ?? prisma.abVariant;

    await abVariantDelegate.update({
      where: { id: selectedVariant.id },
      data: { views: { increment: 1 } },
    });

    selectedLanding = selectedVariant.landingPage;
  }

  if (!selectedLanding?.htmlData) {
    notFound();
  }

  return (
    <div>
      {selectedLanding.cssData ? (
        <style dangerouslySetInnerHTML={{ __html: selectedLanding.cssData }} />
      ) : null}
      <div dangerouslySetInnerHTML={{ __html: selectedLanding.htmlData }} />
    </div>
  );
}
