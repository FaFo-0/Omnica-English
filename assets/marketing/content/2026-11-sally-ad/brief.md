# Sally ad

**Status:** recording 2026-11-09. Edit together afterwards, then post as a Reel and run as a paid ad.

**Goal:** get people to book a trial lesson (paid ad). Organic Reel version: show how learning between lessons works.

## Files

- `recording-sheet.md`: what Sally records (hooks, short and full versions, endings, extra shots).
- `script.ru.txt` / `script.en.txt`: the full script (about 50 s).
- `motion/`: animated graphics in Remotion (word list, 3D flashcard flip, homework, ending). Code and small images only; renders aren't kept in git.
- Raw footage: Google Drive. *(add the link after recording)*

## Edit notes

- The motion graphics have no library scene yet, although the script mentions the library. Add one when we cut the full version.
- Time the graphics and subtitles to Sally's actual takes.
- Ad version: about 25 s, one call to action (trial), ending with «Нажмите на кнопку ниже».
- Graphic fonts change to Inter and PT Serif Italic (see `brand/brand.md`).

## Running the motion project

```
cd assets/marketing/content/2026-11-sally-ad/motion
npm ci
npm run studio      # live preview and editing
npm run render      # → exports/omnica-motion-test.mp4 (not committed)
```
On a Mac, add `-- --browser-executable='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'` if Remotion can't find Chrome.
