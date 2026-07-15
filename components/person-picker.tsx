"use client";

import { useState } from "react";
import type { Person } from "@/lib/types";
import type { CreatePersonInput } from "@/lib/actions";
import { isTempId } from "@/lib/store";
import { focusRing } from "@/lib/a11y";
import { inputField } from "@/lib/field";
import { Button } from "./button";

/**
 * Defaults for a person made inline from the picker — kept in step with the
 * full create-person sheet's starting emoji/theme so a quick add and a proper
 * one look the same afterward.
 */
const NEW_PERSON_DEFAULTS = { emoji: "🌷", theme: "blush" as const };

/**
 * The "who's it for?" picker used by gift lists: a chip rail of people, a
 * "＋ someone new" inline add, and a "just a note" fallback to free text.
 * `personId` is the source of truth; `subtitle` mirrors the chosen name so
 * cards need no extra lookup. All changes flow up through `onChange`.
 */
export function PersonPicker({
  people,
  personId,
  subtitle,
  onChange,
  addPerson,
  label,
  notePlaceholder,
  onCreateError,
}: {
  people: Person[];
  personId?: string;
  subtitle: string;
  onChange: (next: { personId?: string; subtitle: string }) => void;
  addPerson: (input: CreatePersonInput) => Promise<Person>;
  label: string;
  notePlaceholder: string;
  onCreateError?: () => void;
}) {
  // a note is "active" whenever there's free text and no linked person
  const [noteMode, setNoteMode] = useState(!personId && subtitle.trim().length > 0);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const pickPerson = (p: Person) => {
    setNoteMode(false);
    setAdding(false);
    // tapping the selected person again unlinks and clears the denormalized name
    if (p.id === personId) onChange({ personId: undefined, subtitle: "" });
    else onChange({ personId: p.id, subtitle: p.name });
  };

  const startNote = () => {
    setAdding(false);
    setNoteMode(true);
    // drop the person link; keep any free text they'd already typed
    onChange({ personId: undefined, subtitle: personId ? "" : subtitle });
  };

  const saveNew = async () => {
    const name = newName.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      const created = await addPerson({ name, ...NEW_PERSON_DEFAULTS });
      setNoteMode(false);
      setAdding(false);
      setNewName("");
      onChange({ personId: created.id, subtitle: created.name });
    } catch {
      onCreateError?.();
    } finally {
      setCreating(false);
    }
  };

  const chip = (active: boolean, extra = "") =>
    `flex min-h-11 shrink-0 items-center gap-1.5 rounded-pill px-3.5 py-2 text-[0.85rem] font-bold transition ${focusRing} ${
      active ? "bg-ink text-cream shadow-soft" : "bg-cream-deep text-brown ring-1 ring-line/60"
    } ${extra}`;

  return (
    <div>
      <p className="mb-2 text-[0.78rem] font-bold uppercase tracking-wide text-brown-soft">{label}</p>
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {people.filter((p) => !isTempId(p.id)).map((p) => {
          const active = p.id === personId;
          return (
            <button key={p.id} type="button" aria-pressed={active} onClick={() => pickPerson(p)} className={chip(active)}>
              <span aria-hidden>{p.emoji}</span>
              {p.name}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => {
            setAdding(true);
            setNoteMode(false);
          }}
          className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-pill border border-dashed border-line px-3.5 py-2 text-[0.85rem] font-bold text-brown transition ${focusRing}`}
        >
          ＋ someone new
        </button>
        <button type="button" aria-pressed={noteMode} onClick={startNote} className={chip(noteMode)}>
          just a note
        </button>
      </div>

      {adding && (
        <div className="mt-2 flex items-center gap-2">
          <input
            autoFocus
            aria-label="their name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              // isComposing: an IME commit's Enter belongs to the composition, not to us
              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void saveNew();
              }
            }}
            placeholder="their name…"
            className={inputField}
          />
          <Button size="md" className="min-h-11 shrink-0" onClick={saveNew} disabled={!newName.trim() || creating}>
            {creating ? "…" : "add"}
          </Button>
        </div>
      )}

      {noteMode && (
        <input
          aria-label={label}
          value={subtitle}
          onChange={(e) => onChange({ personId: undefined, subtitle: e.target.value })}
          placeholder={notePlaceholder}
          className={`mt-2 ${inputField}`}
        />
      )}
    </div>
  );
}
