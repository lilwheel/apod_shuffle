# APOD Shuffler

Shuffle the highest-resolution photos from NASA's Astronomy Picture of the Day archive.

Live site: https://lilwheel.github.io/apod_shuffle/

## What's in this folder

This folder is a ready-to-deploy static site — commit it as-is (or as your Pages root).

| File | Purpose |
|------|---------|
| `index.html` | The self-contained app (all code + styles + favicons inlined). |
| `apod-catalog.json` | Catalog of the APOD archive (date, title, credit, image URL, size, NASA link). Loaded at start; must sit next to `index.html`. |
| `apod-text.json` | The photos' explanations, keyed by date. Loaded in the background (used for descriptions and search). |
| `build-catalog.mjs` | Rebuilds `apod-catalog.json` and `apod-text.json` from NASA's APOD Basic JSON feed (see below). |
| `cat-og.png` | Social share / Open Graph preview image. |
| `favicon.png`, `favicon-32.png` | Icons (also inlined into `index.html`). |
| `.nojekyll` | Empty file that tells GitHub Pages to skip Jekyll processing. |

## Deploy to GitHub Pages

1. Create a repo and push these files (keeping this folder's structure).
2. **Settings → Pages** → Source: *Deploy from a branch* → pick your branch and the folder that contains `index.html`.
3. After it publishes, open https://lilwheel.github.io/apod_shuffle/.

### Social preview

`index.html` points link previews at the hosted share image:

```html
<meta property="og:image" content="https://lilwheel.github.io/apod_shuffle/cat-og.png">
```

If the site moves, update that URL (it must be absolute).

## Data source

APOD moved to science.nasa.gov in 2026. Following NASA's
[APOD Feed And API User Guide](https://api.nasa.gov/assets/files/apod/APOD-APIs-and-RSS-info.pdf),
the app and the catalog builder use the **APOD Basic JSON** feed, which the guide recommends for sites and apps:

| Use | Endpoint |
|-----|----------|
| Newest photo (on page load) | `https://science.nasa.gov/wp-json/wp/v2/apod-basic?per_page=5` |
| Catalog build (by year, paged) | `…/apod-basic?date_from=YYMMDD&date_to=YYMMDD&per_page=25&page=N` |
| Fallback when the catalog can't load | `…/apod-basic?per_page=25&page=N` |

- No API key is needed, and none is stored in the page. (The old `api.nasa.gov/planetary/apod` API has returned
  placeholder "NASA Science" entries since 2026-06-23 and is no longer used.)
- Images load straight from NASA (`assets.science.nasa.gov`), sized with `?w=…&h=…&fit=clip` so the browser
  downloads only what the screen needs. Wallpaper downloads are cropped in the browser.
- "View on NASA" opens the photo's page on science.nasa.gov; "Original" opens the full-size image.
- Titles, credits and explanations are shown with the photographer's credit, as on NASA's site.

## Refreshing the catalog

The catalog is metadata only (titles, dates, credits, image URLs, pixel sizes, NASA page links, explanations) — no image files.
No key is needed. Run it in this folder:

```bash
node build-catalog.mjs          # whole archive, 1995 → today (~470 requests, about 20 minutes)
```

Commit the new `apod-catalog.json` and `apod-text.json`. The newest photo is always fetched live, so the catalog only needs refreshing for Shuffle and search to include recent days. Old entries whose image NASA has replaced with a generic thumbnail
(mostly small 1990s/2000s GIFs) and video days are skipped.

## How it works

- On load it shows the **latest** APOD from the feed (falling back to the newest catalog entry), without waiting for the catalog.
- **Shuffle** picks a random photo, weighted toward recent years. Two photos are kept ready in the background (checked and downloaded), so a shuffle is usually instant.
- **Prev** steps back through what you've seen; **Latest** returns to today's photo. Keyboard: Space = shuffle, ← / → = back / forward through history, Home = latest, Esc closes menus.
- Photos appear as a quick preview first, then sharpen when the full-size image arrives.
- **Search** jumps to the best keyword match across titles + descriptions; press Enter again for the next match.
- **More of this** finds a photo with a similar colour palette — and if a search term is active, it stays within that theme.
- Optional text filter: photos that are mostly text or diagrams are skipped using in-browser OCR (tesseract.js).
