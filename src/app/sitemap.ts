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
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/rules`,
      lastModified: new Date(),
    },
    ...terms.map((term) => ({
      url: `${baseUrl}/terms/${term.slug}`,
      lastModified: term.updatedAt,
    })),
  ];
}
