import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const terms = await prisma.term
    .findMany({
      where: { status: "published" },
      select: { slug: true, updatedAt: true },
    })
    .catch(() => []);

  return [
    {
      url: baseUrl,
    },
    {
      url: `${baseUrl}/rules`,
    },
    {
      url: `${baseUrl}/vision`,
    },
    {
      url: `${baseUrl}/features`,
    },
    {
      url: `${baseUrl}/features/sanpu`,
    },
    {
      url: `${baseUrl}/features/engagement`,
    },
    {
      url: `${baseUrl}/rules/classification`,
    },
    {
      url: `${baseUrl}/rules/permissions`,
    },
    {
      url: `${baseUrl}/legal/terms`,
    },
    {
      url: `${baseUrl}/legal/privacy`,
    },
    ...terms.map((term) => ({
      url: `${baseUrl}/terms/${term.slug}`,
      lastModified: term.updatedAt,
    })),
  ];
}
