// Sums gzipped client JS in .next/static/chunks — the deterministic size metric.
// Run AFTER `npm run build`. Prints a human table + a PERF_JSON line to diff.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const DIR = ".next/static/chunks";
let files;
try {
  files = readdirSync(DIR).filter((f) => f.endsWith(".js"));
} catch {
  console.error(`No build found at ${DIR}. Run \`npm run build\` first.`);
  process.exit(1);
}

const rows = files
  .map((f) => {
    const buf = readFileSync(join(DIR, f));
    return { f, raw: statSync(join(DIR, f)).size, gz: gzipSync(buf).length };
  })
  .sort((a, b) => b.gz - a.gz);

const totalRaw = rows.reduce((n, r) => n + r.raw, 0);
const totalGz = rows.reduce((n, r) => n + r.gz, 0);
const kb = (n) => (n / 1024).toFixed(1).padStart(8);

console.log("gzip(KB)   raw(KB)   chunk");
for (const r of rows.slice(0, 12)) console.log(`${kb(r.gz)} ${kb(r.raw)}   ${r.f}`);
console.log("--------");
console.log(`${kb(totalGz)} ${kb(totalRaw)}   TOTAL (${rows.length} chunks)`);
console.log(
  `PERF_JSON ${JSON.stringify({ totalGzipKB: +(totalGz / 1024).toFixed(1), totalRawKB: +(totalRaw / 1024).toFixed(1), chunkCount: rows.length })}`
);
