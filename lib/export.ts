// lib/export.ts — pure, no I/O, unit-testable.
export interface ExportInput {
  exportedAt: string;
  profile: { name: string; theme: string };
  lists: Array<{ id: string; title: string; emoji: string; template: string;
    items: Array<{ id: string; title: string; note: string | null; status: string | null; tags: string[] }> }>;
  people: Array<{ id: string; name: string; emoji: string;
    details: Array<{ id: string; section: string; title: string; note: string | null; tags: string[] }> }>;
  scraps: Array<{ id: string; text: string }>;
}
export type ExportDocument = ExportInput;

export function buildExportJson(input: ExportInput): ExportDocument {
  return input; // already the complete nested shape; explicit for a stable contract
}

function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = Array.isArray(value) ? value.join("; ") : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const header = columns.map(cell).join(",");
  const body = rows.map((r) => columns.map((c) => cell(r[c])).join(","));
  return [header, ...body].join("\r\n") + "\r\n";
}

export function buildCsvSections(input: ExportInput): { name: string; csv: string }[] {
  const lists = input.lists.map((l) => ({ id: l.id, title: l.title, emoji: l.emoji, template: l.template }));
  const items = input.lists.flatMap((l) =>
    l.items.map((i) => ({ listId: l.id, listTitle: l.title, id: i.id, title: i.title,
      status: i.status, note: i.note, tags: i.tags })));
  const people = input.people.map((p) => ({ id: p.id, name: p.name, emoji: p.emoji }));
  const details = input.people.flatMap((p) =>
    p.details.map((d) => ({ personId: p.id, personName: p.name, id: d.id, section: d.section,
      title: d.title, note: d.note, tags: d.tags })));
  const scraps = input.scraps.map((s) => ({ id: s.id, text: s.text }));
  return [
    { name: "lists", csv: toCsv(lists, ["id", "title", "emoji", "template"]) },
    { name: "items", csv: toCsv(items, ["listId", "listTitle", "id", "title", "status", "note", "tags"]) },
    { name: "people", csv: toCsv(people, ["id", "name", "emoji"]) },
    { name: "details", csv: toCsv(details, ["personId", "personName", "id", "section", "title", "note", "tags"]) },
    { name: "scraps", csv: toCsv(scraps, ["id", "text"]) },
  ];
}
