// lib/export.ts — pure, no I/O, unit-testable.
export interface ExportInput {
  exportedAt: string;
  profile: { name: string; theme: string };
  lists: Array<{ id: string; title: string; emoji: string; template: string; theme: string;
    description: string | null; pinned: boolean;
    items: Array<{ id: string; title: string; subtitle: string | null; note: string | null;
      status: string | null; rating?: number; type?: string; emoji: string | null;
      imageUrl: string | null; tags: string[]; personId: string | null; pinned: boolean }> }>;
  people: Array<{ id: string; name: string; emoji: string; theme: string; note: string | null;
    specialDay?: string;
    details: Array<{ id: string; section: string; title: string; note: string | null; tags: string[] }> }>;
  scraps: Array<{ id: string; text: string }>;
}
export type ExportDocument = ExportInput;

export function buildExportJson(input: ExportInput): ExportDocument {
  return input; // already the complete nested shape; explicit for a stable contract
}

function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s = Array.isArray(value) ? value.join("; ") : String(value);
  // Neutralize spreadsheet formula injection: a leading = + - @ (or tab/CR) can
  // be interpreted as a formula by Excel/Sheets when the CSV is opened there.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const header = columns.map(cell).join(",");
  const body = rows.map((r) => columns.map((c) => cell(r[c])).join(","));
  return [header, ...body].join("\r\n") + "\r\n";
}

export function buildCsvSections(input: ExportInput): { name: string; csv: string }[] {
  const nameById = new Map(input.people.map((p) => [p.id, p.name]));
  const lists = input.lists.map((l) => ({ id: l.id, title: l.title, emoji: l.emoji, template: l.template,
    theme: l.theme, description: l.description, pinned: l.pinned }));
  const items = input.lists.flatMap((l) =>
    l.items.map((i) => ({ listId: l.id, listTitle: l.title, id: i.id, title: i.title,
      subtitle: i.subtitle, status: i.status, rating: i.rating, type: i.type, note: i.note,
      emoji: i.emoji, imageUrl: i.imageUrl, tags: i.tags, personId: i.personId,
      personName: nameById.get(i.personId ?? "") ?? "", pinned: i.pinned })));
  const people = input.people.map((p) => ({ id: p.id, name: p.name, emoji: p.emoji, theme: p.theme,
    note: p.note, specialDay: p.specialDay }));
  const details = input.people.flatMap((p) =>
    p.details.map((d) => ({ personId: p.id, personName: p.name, id: d.id, section: d.section,
      title: d.title, note: d.note, tags: d.tags })));
  const scraps = input.scraps.map((s) => ({ id: s.id, text: s.text }));
  return [
    { name: "lists", csv: toCsv(lists, ["id", "title", "emoji", "template", "theme", "description", "pinned"]) },
    { name: "items", csv: toCsv(items, ["listId", "listTitle", "id", "title", "subtitle", "status", "rating",
      "type", "note", "emoji", "imageUrl", "tags", "personId", "personName", "pinned"]) },
    { name: "people", csv: toCsv(people, ["id", "name", "emoji", "theme", "note", "specialDay"]) },
    { name: "details", csv: toCsv(details, ["personId", "personName", "id", "section", "title", "note", "tags"]) },
    { name: "scraps", csv: toCsv(scraps, ["id", "text"]) },
  ];
}
