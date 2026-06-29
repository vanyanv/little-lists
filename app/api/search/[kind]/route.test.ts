import { describe, it, expect } from "vitest";
import { GET } from "./route";

function call(kind: string, q: string) {
  return GET(new Request(`http://t/api/search/${kind}?q=${encodeURIComponent(q)}`), {
    params: Promise.resolve({ kind }),
  });
}

describe("GET /api/search/[kind]", () => {
  it("returns 400 for an unknown kind", async () => {
    const res = await call("widgets", "hello");
    expect(res.status).toBe(400);
  });

  it("returns 200 and [] for an empty query without hitting a provider", async () => {
    const res = await call("movie", "   ");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });
});
