#!/usr/bin/env node
// build-catalog.mjs
// Builds an APOD METADATA catalog (no image files stored — just metadata + URLs).
// The whole archive (1995 → today) is fetched in ~125 API calls using 3-month date
// ranges (longer ranges now make the API time out with HTTP 500), which stays well
// under NASA's ~1,000 requests/hour limit for a personal key.
//
// USAGE:
//   1) Get a free key at https://api.nasa.gov  (instant, no cost)
//   2) Run:
//        NASA_KEY=your_key_here node build-catalog.mjs > apod-catalog.json
//      (or)  node build-catalog.mjs your_key_here > apod-catalog.json
//   3) Host apod-catalog.json somewhere CORS-friendly (GitHub raw, your site, etc.)
//   4) In APOD-Shuffle-website.html, set:  this.bakedLibrary = 'https://.../apod-catalog.json';
//
// Re-run anytime to refresh (e.g. weekly) — the API is the source of truth, so
// if NASA ever changes an image URL, regenerating picks up the new one automatically.
//
// Requires Node 18+ (built-in fetch). No npm install needed.

import process from 'node:process';

const KEY   = process.env.NASA_KEY || process.argv[2] || 'DEMO_KEY';
const API   = 'https://api.nasa.gov/planetary/apod';
const START = '1995-06-16';            // first APOD
const PAUSE = 1500;
const MONTHS_PER_CALL = 3;            // keep ranges short; a full year returns HTTP 500                    // ms between calls (polite; well under the limit)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fmt   = (d) => d.toISOString().slice(0, 10);

if (KEY === 'DEMO_KEY') {
  console.error('⚠  Using DEMO_KEY (a few requests/hr) — a full build will be rate-limited. Use your own free key from api.nasa.gov.');
}

async function fetchRange(start, end) {
  const url = `${API}?api_key=${KEY}&start_date=${start}&end_date=${end}`;
  for (let attempt = 0; attempt < 6; attempt++) {
    let r;
    try { r = await fetch(url); } catch (e) { console.error('  network error, retrying…'); await sleep(5000); continue; }
    if (r.status === 429) { console.error('  rate limited — waiting 60s…'); await sleep(60000); continue; }
    if (!r.ok)            { console.error(`  HTTP ${r.status} — retrying…`); await sleep(4000); continue; }
    try { return await r.json(); } catch (e) { console.error('  bad JSON — retrying…'); await sleep(4000); }
  }
  console.error(`  giving up on ${start}..${end}`);
  return [];
}

function* rangeChunks(start, end) {
  let s = new Date(start);
  while (s <= end) {
    let e = new Date(s);
    e.setMonth(e.getMonth() + MONTHS_PER_CALL);
    e.setDate(e.getDate() - 1);
    if (e > end) e = end;
    yield [fmt(s), fmt(e)];
    s = new Date(e);
    s.setDate(s.getDate() + 1);
  }
}

const today = new Date();
const out = [];
let calls = 0;

for (const [s, e] of rangeChunks(new Date(START), today)) {
  const arr = await fetchRange(s, e);
  calls++;
  for (const j of (Array.isArray(arr) ? arr : [arr])) {
    const src = (j && (j.hdurl || j.url)) || '';
    // Since mid-2026 the API returns a NASA-logo placeholder ("NASA Science") for new dates.
    const placeholder = /nasa-logo|science\.nasa\.gov\/wp-content\/themes/i.test(src) ||
                        String(j && j.title || '').trim().toLowerCase() === 'nasa science';
    if (j && j.media_type === 'image' && src && !placeholder) {
      out.push({
        date: j.date,
        title: j.title || '',
        credit: (j.copyright || '').replace(/\s+/g, ' ').trim(),
        url: j.hdurl || j.url,
        explanation: (j.explanation || '').replace(/\s+/g, ' ').trim()
        // Optional fields the app will use IF present (add via an analysis pass later):
        //   w, h            -> skip the in-app dimension check
        //   words           -> skip the in-app OCR text check
        //   color: {r,g,b}  -> skip the in-app color sampling ("More of this")
      });
    }
  }
  console.error(`${s}..${e}  →  ${out.length} images so far`);
  await sleep(PAUSE);
}

out.sort((a, b) => (a.date < b.date ? 1 : -1)); // newest first
process.stdout.write(JSON.stringify(out));
console.error(`\n✓ Done — ${out.length} images in ${calls} API calls.`);
