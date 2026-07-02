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
| `.nojekyll` | Tells GitHub Pages to skip Jekyll processing. |

## Deploy to GitHub Pages

1. Create a repo and push these files (keeping this folder's structure).
2. **Settings → Pages** → Source: *Deploy from a branch* → pick your branch and the folder that contains `index.html`.
3. After it publishes, open the `USER.github.io/REPO/` URL.

### One thing to personalize

`index.html` sets the social-share image to a placeholder URL:

```html
<meta property="og:image" content="https://USER.github.io/REPO/cat-og.png">
```

Replace `USER` and `REPO` with your GitHub username and repository name so link previews resolve the image. (Edit the source `APOD Shuffle.dc.html` and re-bundle, or edit this one `<meta>` tag directly.)

## Refreshing the catalog

The catalog is APOD metadata only (titles, dates, credits, image URLs) — no image files. Regenerate anytime with a free NASA key:

```bash
# get a free key at https://api.nasa.gov
NASA_KEY=your_key_here node build-catalog.mjs > apod-catalog.json
```

The whole archive (1995 → today) fetches in ~31 API calls, well under NASA's rate limit. Copy the new `apod-catalog.json` into this folder and commit.

## How it works

- On load it shows the **latest** APOD (fetched live, falling back to the newest catalog entry offline).
- **Shuffle / Prev / Next** walk a recency-weighted random ordering of the archive.
- **Search** jumps to the best keyword match across titles + descriptions.
- **More of this** finds a visually similar photo — and if a search term is active, it stays within that theme.
- Users can paste their own free NASA API key (stored locally) to lift the shared demo-key rate limit.
