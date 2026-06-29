import { searchByKind } from "@/lib/search";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ kind: string }> },
) {
  const { kind } = await params;
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const hits = await searchByKind(kind, q);
  if (hits === null) {
    return Response.json({ error: "unknown search kind" }, { status: 400 });
  }
  return Response.json(hits);
}
