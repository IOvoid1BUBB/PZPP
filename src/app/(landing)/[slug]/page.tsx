import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getLandingPageBySlug } from "@/app/actions/landingPageActions";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await getLandingPageBySlug(slug);
  if (!page) return {};

  return {
    title: page.title || page.slug,
    robots: { index: true, follow: true },
  };
}

export default async function LandingRootSlugPage({ params }: PageProps) {
  const { slug } = await params;
  const page = await getLandingPageBySlug(slug);
  if (!page) notFound();

  const htmlData = page.htmlData || "";
  const cssData = page.cssData || "";

  return (
    <div style={{ width: "100vw", minHeight: "100vh", margin: 0, padding: 0 }}>
      <style
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: `
            html, body { margin: 0; padding: 0; height: 100%; width: 100%; }
            body { overflow-x: hidden; }
            ${cssData}
          `,
        }}
      />
      <main
        style={{ width: "100%", minHeight: "100vh" }}
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: htmlData }}
      />
    </div>
  );
}

