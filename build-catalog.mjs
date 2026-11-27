#!/usr/bin/env node
// build-catalog.mjs
// Builds the APOD metadata catalog (no image files — just metadata + image URLs)
// from NASA's "APOD Basic JSON" feed, the source the APOD Feed And API User Guide
// recommends for sites and apps:
//   https://science.nasa.gov/wp-json/wp/v2/apod-basic?date_from=YYMMDD&date_to=YYMMDD&per_page=25&page=N
// No API key is needed. Results are capped at 25 per page, so each year is paged
// through using the X-WP-TotalPages header.
//
// USAGE (Node 18+, no npm install):
//   node build-catalog.mjs              # run in the site folder; writes apod-catalog.json + apod-text.json
//
// Output (two files, so the app can start shuffling before the long texts arrive):
//   apod-catalog.json — newest-first array of { date, title, credit, url, w, h, link }
//   apod-text.json    — { "YYYY-MM-DD": explanation, … }, loaded by the app in the background
// where url is the full-size image (assets.science.nasa.gov, resizable with ?w=&h=&fit=clip),
// w/h are its pixel size (so the app can skip measuring), and link is the APOD page on science.nasa.gov.

import process from 'node:process';
import { writeFileSync } from 'node:fs';

const FEED  = 'https://science.nasa.gov/wp-json/wp/v2/apod-basic';
const PAUSE = 400;        // ms between requests — be polite to science.nasa.gov
const FIRST_YEAR = 1995;  // first APOD: 1995-06-16

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const yy = (y) => String(y % 100).padStart(2, '0');

const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘',
  rdquo: '”', ldquo: '“', ndash: '–', mdash: '—', hellip: '…', deg: '°',
  eacute: 'é', ouml: 'ö', uuml: 'ü', auml: 'ä', aacute: 'á', iacute: 'í',
  oacute: 'ó', ntilde: 'ñ', ccedil: 'ç', times: '×', copy: '©', middot: '·' };
const decode = (s) => String(s || '')
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
  .replace(/&([a-z]+);/gi, (m, n) => NAMED[n.toLowerCase()] ?? m);
const text = (html) => decode(String(html || '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ')
  .replace(/\s+([.,;:!?)\]])/g, '$1').replace(/([(\[])\s+/g, '$1')
  .replace(/\uFFFD/g, '\u2019').trim();   // no stray spaces where tags were removed; a few source texts have a broken apostrophe

// Some old posts have a generic NASA thumbnail instead of the day's picture; keep only real APOD images.
const isApodImage = (u) => /^https:\/\/assets\.science\.nasa\.gov\/.+\/apod\//i.test(u || '');

async function getPage(from, to, page) {
  const url = `${FEED}?date_from=${from}&date_to=${to}&per_page=25&page=${page}`;
  for (let attempt = 0; attempt < 6; attempt++) {
    let r;
    try { r = await fetch(url, { headers: { Accept: 'application/json' } }); }
    catch (e) { console.error('  network error, retrying…'); await sleep(5000); continue; }
    if (r.status === 429 || r.status >= 500) { console.error(`  HTTP ${r.status} — waiting…`); await sleep(15000 * (attempt + 1)); continue; }
    if (r.status === 400 && page > 1) return { items: [], pages: page - 1 };   // past the last page
    if (!r.ok) { console.error(`  HTTP ${r.status} for ${url}`); await sleep(4000); continue; }
    try { return { items: await r.json(), pages: +(r.headers.get('x-wp-totalpages') || 1) }; }
    catch (e) { console.error('  bad JSON — retrying…'); await sleep(4000); }
  }
  throw new Error(`giving up on ${url}`);
}

const thisYear = new Date().getFullYear();
const years = Array.from({ length: thisYear - FIRST_YEAR + 1 }, (_, i) => FIRST_YEAR + i);

const out = new Map();
let requests = 0, skipped = 0;
for (const y of years) {
  let page = 1, pages = 1;
  do {
    const res = await getPage(`${yy(y)}0101`, `${yy(y)}1231`, page);
    requests++; pages = res.pages;
    for (const j of res.items) {
      const hd = j.hdurl || '';
      if (j.media_type !== 'image' || !isApodImage(hd) || !/^\d{4}-\d\d-\d\d$/.test(j.date || '')) { skipped++; continue; }
      let w = 0, h = 0; try { const q = new URL(hd).searchParams; w = +q.get('w') || 0; h = +q.get('h') || 0; } catch (e) {}
      const row = { date: j.date, title: text(j.title), credit: text(j.copyright || j.credit).replace(/^(Image\s+)?(Credit|Copyright)(\s*(&|and)\s*(Copyright|Credit))?\s*:\s*/i, ''), url: hd };
      if (w && h) { row.w = w; row.h = h; }
      row.link = j.permalink || j.url || '';
      row.explanation = text(j.explanation).replace(/^Explanation:\s*/i, '');
      out.set(j.date, row);
    }
    page++;
    await sleep(PAUSE);
  } while (page <= pages);
  console.error(`${y}: ${out.size} images so far (${requests} requests)`);
}

const rows = [...out.values()].sort((a, b) => (a.date < b.date ? 1 : -1)); // newest first
writeFileSync('apod-catalog.json', JSON.stringify(rows.map(({ explanation, ...row }) => row)));
writeFileSync('apod-text.json', JSON.stringify(Object.fromEntries(rows.map((r) => [r.date, r.explanation]))));
console.error(`\n✓ Done — ${rows.length} images (${skipped} videos/placeholders skipped) in ${requests} requests → apod-catalog.json + apod-text.json`);
