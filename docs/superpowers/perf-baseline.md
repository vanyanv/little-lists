# Performance baseline & results

Method: gzipped client JS from `next build`; runtime typing probe per
`tests/perf/README.md` (proxy for iPhone via exaggerated list size, desktop).

| Metric | Baseline (8f3572b) | After Slice 1 | After Slice 2 | Delta |
|---|---|---|---|---|
| Total client JS (gzip) | 477.5 KB | — | — | — |
| List-route first-load JS (gzip) | n/a (Turbopack build omits per-route sizes) | — | — | — |
| Typing burst, 25 keys / 80-item list (ms) | TBD | — | — | — |

Total client JS is measured with `node scripts/perf/bundle-report.mjs` after
`npm run build`, summing gzipped size of every file in
`.next/static/chunks`. Current run: 477.5 KB gzip / 1519.8 KB raw across 39
chunks (`PERF_JSON {"totalGzipKB":477.5,"totalRawKB":1519.8,"chunkCount":39}`).

Next.js 16 Turbopack builds do not print a per-route "First Load JS" column
(verified against this repo's build output), so the list-route first-load
figure is not available from the build log. Total gzipped client JS above is
the authoritative size metric for this measurement harness.

(List-route first-load and the typing baseline are captured during execution
before Slice 1 lands.)
