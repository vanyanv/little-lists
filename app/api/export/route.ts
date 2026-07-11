import JSZip from "jszip";
import { prisma } from "@/lib/prisma";
import { getCurrentUserProfile } from "@/lib/server/profile";
import { buildExportJson, buildCsvSections, type ExportInput } from "@/lib/export";
import { templateToUi } from "@/lib/server/serialize";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const profile = await getCurrentUserProfile();
  if (!profile) return new Response("Unauthorized", { status: 401 });
  const userId = profile.clerkUserId;

  const [lists, people, scraps] = await Promise.all([
    prisma.list.findMany({ where: { userId }, orderBy: { createdAt: "asc" },
      include: { items: { orderBy: { createdAt: "asc" } } } }),
    prisma.person.findMany({ where: { userId }, orderBy: { createdAt: "asc" },
      include: { details: { orderBy: { createdAt: "asc" } } } }),
    prisma.scrap.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
  ]);

  const input: ExportInput = {
    exportedAt: new Date().toISOString(),
    profile: { name: profile.displayName, theme: profile.themeColor ?? "blush" },
    lists: lists.map((l) => ({ id: l.id, title: l.title, emoji: l.emoji,
      template: String(templateToUi(l.templateType)), theme: l.themeColor,
      description: l.description ?? null, pinned: l.pinned,
      items: l.items.map((i) => {
        const meta = (i.metadata ?? {}) as { type?: string; rating?: number };
        return { id: i.id, title: i.title, subtitle: i.subtitle, note: i.note,
          status: i.status, rating: meta.rating, type: meta.type, emoji: i.emoji,
          imageUrl: i.imageUrl, tags: i.tags, personId: i.personId, pinned: i.pinned };
      }) })),
    people: people.map((p) => ({ id: p.id, name: p.name, emoji: p.emoji,
      theme: p.themeColor ?? "blush", note: p.shortNote ?? null, specialDay: p.specialDay ?? undefined,
      details: p.details.map((d) => ({ id: d.id, section: d.section, title: d.title,
        note: d.note, tags: d.tags })) })),
    scraps: scraps.map((s) => ({ id: s.id, text: s.text })),
  };

  const format = new URL(req.url).searchParams.get("format") ?? "json";

  if (format === "csv") {
    const zip = new JSZip();
    for (const { name, csv } of buildCsvSections(input)) zip.file(`${name}.csv`, csv);
    const buffer = await zip.generateAsync({ type: "nodebuffer" });
    const blob = new Uint8Array(buffer);
    return new Response(blob, {
      headers: {
        "content-type": "application/zip",
        "content-disposition": 'attachment; filename="little-lists-export.zip"',
      },
    });
  }

  return new Response(JSON.stringify(buildExportJson(input), null, 2), {
    headers: {
      "content-type": "application/json",
      "content-disposition": 'attachment; filename="little-lists-export.json"',
    },
  });
}
