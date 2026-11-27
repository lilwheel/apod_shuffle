# APOD Shuffler

Shuffle the highest-resolution photos from NASA's Astronomy Picture of the Day archive.

## What's in this folder

This folder is a ready-to-deploy static site — commit it as-is (or as your Pages root).

| File | Purpose |
|------|---------|
| `index.html` | The self-contained app (all code + styles + favicons inlined). |
| `apod-catalog.json` | Baked metadata catalog of the APOD archive. Fetched at runtime, must sit next to `index.html`. |
| `cat-og.png` | Social share / Open Graph preview image. |
| `favicon.png`, `favicon-32.png` | Icons (also inlined into `index.html`). |
| `build-catalog.mjs` | Rebuilds `apod-catalog.json` from the NASA API (see below). |
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

## Refreshing the catalog

The catalog is APOD metadata only (titles, dates, credits, image URLs) — no image files. Regenerate anytime with a free NASA key:

```bash
# get a free key at https://api.nasa.gov
NASA_KEY=your_key_here node build-catalog.mjs > apod-catalog.json
```

The whole archive (1995 → today) fetches in ~125 three-month API calls, well under the rate limit for a personal key. Copy the new `apod-catalog.json` into this folder and commit.

## How it works

- On load it shows the **latest** APOD (fetched live, falling back to the newest catalog entry offline).
- **Shuffle / Prev / Next** walk a recency-weighted random ordering of the archive (keyboard: Space, ←, →; Esc closes menus).
- **Search** jumps to the best keyword match across titles + descriptions; press Enter again for the next match.
- **More of this** finds a visually similar photo — and if a search term is active, it stays within that theme.
- No API key is built in: the app uses NASA's shared `DEMO_KEY` only to fetch the newest photos, and shuffling runs from the catalog. Visitors can paste their own free key (stored in their browser only) to lift the demo key's rate limit.
- Photos come from the UCL APOD mirror (`www.star.ucl.ac.uk/~apod`), resized through the `images.weserv.nl` image proxy. "View on NASA" opens the day's page on NASA's site; "Original" opens the full-size file on the mirror, because apod.nasa.gov image links now redirect to science.nasa.gov.

### Known limitation (since June 2026)

APOD moved to science.nasa.gov, and since 2026-06-23 the NASA API returns a "NASA Science" logo placeholder instead of the day's photo. The catalog therefore ends at 2026-06-22; `build-catalog.mjs` and the app both skip the placeholder entries, so nothing breaks, but newer photos won't appear until the API is fixed.
