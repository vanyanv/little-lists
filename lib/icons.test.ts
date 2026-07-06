import { describe, it, expect } from "vitest";
import { CATEGORY_GLYPH } from "@/components/icons/category-icon";
import { FUNCTIONAL_GLYPHS, GLYPH_ART } from "@/components/icons/glyphs";
import { ITEM_TYPE_META, TEMPLATE_META } from "./types";
import { PERSON_SECTIONS } from "./people";
import { PERSON_STARTER, STARTER_OPTIONS } from "./onboarding";

describe("CATEGORY_GLYPH", () => {
  it("covers every item type", () => {
    for (const id of Object.keys(ITEM_TYPE_META)) {
      expect(CATEGORY_GLYPH[id], `item type "${id}"`).toBeDefined();
    }
  });

  it("covers every list template", () => {
    for (const id of Object.keys(TEMPLATE_META)) {
      expect(CATEGORY_GLYPH[id], `template "${id}"`).toBeDefined();
    }
  });

  it("covers every person section", () => {
    for (const s of PERSON_SECTIONS) {
      expect(CATEGORY_GLYPH[s.id], `person section "${s.id}"`).toBeDefined();
    }
  });

  it("covers every onboarding starter", () => {
    for (const opt of STARTER_OPTIONS) {
      expect(CATEGORY_GLYPH[opt.id], `starter "${opt.id}"`).toBeDefined();
    }
    expect(CATEGORY_GLYPH[PERSON_STARTER.id]).toBeDefined();
  });

  it("only points at glyphs that exist in the registry", () => {
    for (const [id, glyph] of Object.entries(CATEGORY_GLYPH)) {
      expect(GLYPH_ART[glyph], `"${id}" → "${glyph}"`).toBeDefined();
    }
  });

  it("movie renders the clapperboard, not the decorative film strip", () => {
    expect(CATEGORY_GLYPH.movie).toBe("clapperboard");
    expect(CATEGORY_GLYPH.movies).toBe("clapperboard");
    expect(GLYPH_ART.clapperboard).toBeDefined();
  });
});

describe("GLYPH_ART", () => {
  it("has art for every template's corner sticker", () => {
    for (const [id, meta] of Object.entries(TEMPLATE_META)) {
      expect(GLYPH_ART[meta.sticker], `template "${id}" sticker`).toBeDefined();
    }
  });

  it("never uses a functional glyph as a decorative corner sticker", () => {
    for (const [id, meta] of Object.entries(TEMPLATE_META)) {
      expect(FUNCTIONAL_GLYPHS.has(meta.sticker), `template "${id}"`).toBe(false);
    }
  });
});
