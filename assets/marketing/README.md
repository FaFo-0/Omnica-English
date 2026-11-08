# Omnica English — marketing

Everything we publish, and everything we make it from. It follows one workflow and keeps one set of brand rules.

## Folders

| Folder | What goes in it |
|---|---|
| `brand/` | `brand.md` (colors, fonts, logo, voice) and `instagram.md` (profile, bio, links, highlight list). **Read these before making anything.** |
| `library/` | Raw material: `screenshots/` (real app captures from QA accounts, one dated folder per session) and `photos/` (teachers, Mustafa, Sally). |
| `templates/` | Shared reusable designs (Story, post, carousel). Every piece starts from one of them. |
| `content/` | One folder per piece, named `YYYY-MM-name/`. It holds `brief.md` plus the **final** files only. |
| `archive/` | Pieces that are already published and no longer edited. |

## How we make a piece

1. **Idea:** FaFo describes it in a sentence or two.
2. **Brief:** Claude writes `content/YYYY-MM-name/brief.md`, covering the goal, where it's posted, and the copy for every slide or Story in Russian with an English translation.
3. **Copy approved:** FaFo approves or changes the text. Design doesn't start until the copy is approved, so we never redesign because of wording.
4. **Design:** built from `templates/` using `brand/`, then rendered and sent to FaFo in chat.
5. **Tweaks:** FaFo gives feedback such as "bigger headline" or "swap this screenshot", and Claude re-renders.
6. **Final:** final files go into the piece's folder. When it's posted, note the date and link at the top of `brief.md`. Pieces that are done and no longer edited move to `archive/`.

## Rules (they keep the folder clean)

- **No zips** and no `v1/v2/v3` folders. Git keeps every old version; overwrite the files.
- **No large files in git.** Raw video and anything over about 10 MB go to Google Drive, with the link in `brief.md`.
- **Screenshots come from the real app, using the QA accounts** (`npm run qa:setup`, `node scripts/dev-login.mjs student`). Never use real students' data. No AI-generated UI, fake reviews or invented results.
- **Phone-sized screenshots** for Stories and Reels (390 px wide at 3×). Desktop captures are for the website only.
- **Business facts** (prices, the trial, payment) come from `POLICY.md` and the live `/prices` page. Never invent them.
