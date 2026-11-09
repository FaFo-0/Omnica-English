# Story template

One renderer for every Instagram Story and highlight cover. It uses the colors and fonts from `brand/brand.md`.

```
NODE_USE_ENV_PROXY=1 node assets/marketing/templates/story/render.cjs assets/marketing/content/<piece>        # all
NODE_USE_ENV_PROXY=1 node assets/marketing/templates/story/render.cjs assets/marketing/content/<piece> 2-3    # one story
```
(Run from the repo root. `NODE_USE_ENV_PROXY=1` is only needed in Claude cloud sessions.)

The piece's `stories.json` lists highlights (`slug`, `icon`), each with stories:

| Field | Meaning |
|---|---|
| `bg` | `purple` · `cream` · `yellow` |
| `title` | Bold lines (Inter ExtraBold) |
| `accent` | Italic lines (PT Serif Italic), at most one per story |
| `body` | Small supporting lines |
| `visual` | `screenshot` (`src`, `crop` = [top, bottom] in phone CSS px, optional `width`) · `steps` · `chat` · `panels` · `icon` · `mark` (logo) · `link` (empty space and an arrow for Instagram's Link sticker) |

Icons are Lucide names (the same set as the app). Output goes to `stories/` (1080 × 1920) and `covers/` (1080 × 1080).
