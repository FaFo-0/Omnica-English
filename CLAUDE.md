# Omnica English — AI Instructions

Online English academy **Omnica English** (omnicaenglish.com) — website, student/teacher/admin portals, one codebase. Owner: Mustafa (FaFo). The old internal name "OmniClass" is retired; don't reintroduce it.

## Files that matter

| File | Purpose |
|---|---|
| `MASTER_PLAN.md` | **Read first.** Platform reference: what exists, standing rules, known-issues queue, deployment. |
| `POLICY.md` | Business policy source of truth (payments, cancellation, no-show, pauses, trials). Never restate it elsewhere — link to it. Don't edit unless FaFo changes policy. |
| `CLAUDE.md` | This file — AI behavior only. The **single rules file for every AI** (Claude, DeepSeek, any other); `AGENTS.md` just points here. |
| `docs/CHANGELOG.md` | Change log, newest first. |
| `.env.local` | API keys. Never commit or expose. |

## Workflow (FaFo's — do not impose your own)

1. **No phases, no steps, no roadmaps, no audit reports.** FaFo opens a page, dumps what he wants changed, you change it. Make routine calls yourself; ask only when readings genuinely diverge.
2. **Preview, then ship.** Live site has real students. Work on a branch: commit, `npm run push:dev` if `convex/` changed (uploads the branch backend to dev Convex), push the branch. Vercel builds a login-protected preview wired to dev Convex + dev Clerk with one-tap **Test as…** role buttons — send FaFo the branch preview link (`omnica-english-git-<branch>-fafo-s-projects.vercel.app`). When FaFo says **ship**: merge to `master` and push — the Vercel production build deploys Convex first (`vercel.json`, `CONVEX_DEPLOY_KEY`), then builds the site, so UI never runs against old functions. Don't wait on the build; say it's live in ~2 min. Flag destructive schema changes before shipping. FaFo may say "ship directly" for tiny copy/style fixes.
3. Build now, test at the very end. Mobile pass dead last. i18n fix deliberately last.
4. Verify your work in the browser (`node scripts/dev-login.mjs [role]` mints a login URL) rather than asking FaFo to check.
   **Reusable QA:** use `npm run qa:setup`, then `node scripts/dev-login.mjs admin|teacher|student|student-kk`; `npm run qa:replenish` restores test credits/due cards without deleting history. Reuse these fictional actors and fixtures, never recreate them or use production for routine QA. See MASTER_PLAN §4/§5 for isolation, coverage and external-service limits.
5. When work lands: remove fixed items from MASTER_PLAN §5 (known issues, open items only) and add an entry at the top of `docs/CHANGELOG.md`. **Attribution mandatory** — tag entries `[Claude]` / `[DeepSeek V4 Pro]` / `[AI-Name]`.
6. Keep MASTER_PLAN minimal and organized — update the relevant section in place, never scatter.
7. **Which AI:** Claude is the default for code and marketing. DeepSeek is the fallback for small, clearly scoped tasks (copy, translations, tiny fixes). Both follow this file and the same preview → ship flow.
8. **Challenge FaFo's ideas.** FaFo says he is not an expert in marketing, design or anything else here, and his ideas aren't automatically better than yours. When he proposes a design, copy or product direction, question it and offer a better option when you see one, with a short reason. Then build what he decides.
9. **Phone first for public pages.** Most visitors are on phones. Design and check mobile first; desktop only needs to look fine (this overrides "mobile pass dead last" for public pages).
10. **FaFo prefers taps over typing.** Give him links and one-tap flows; never ask him to retype or copy long emails, passwords or codes.

## Tech stack (locked — discuss before changing)

Next.js 16 (App Router, Turbopack) · Tailwind CSS v4 + shadcn/ui · **Convex** (all data; org-scoped via `convex/lib/tenant.ts`) · **Clerk** (identity only — Organizations not used; JWT template `convex`; prod instance for omnicaenglish.com, dev instance for localhost/previews) · Soniox v4 STT · OpenRouter LLMs · next-intl (en/ru/ar/kk) · Inter font · Lucide icons. Convex function conventions: `.claude/rules/convex-rules.md`.

## Hard rules (each earned by a real bug — details in MASTER_PLAN §1)

- **Never `new Date(date + "T" + time)` without a timezone.** Stored times are academy wall-clock (Asia/Almaty). Use `wallTimeToMs` / `zonedToInstant`.
- **Reading model locked:** word on the student's list (green) or plain prose. No per-word statuses. One shared `ReadingView` for all portals.
- **`srsCards` is the one word list** — flashcards, My Words, reading tint all derive from it. Card answers = translation into the student's L1 (`users.getLearnerLocale`).
- **Say "lessons", never "points"** in any user-facing copy.
- Logical CSS properties (`ms-`/`me-`/`ps-`/`pe-`) for future RTL. No hardcoded tenant branding — `tenantSettings` owns it.
- No over-engineering. Live with a handful of students, ~50 target — build for that.
- **Incident before feature:** don't turn a one-off data anomaly into a permanent warning, detector or repair button. Prove it reproduces in normal use, fix the root cause, clean the bad data manually.
- **Tests must earn their place:** add a focused regression test for a real bug or an important invariant; don't add tests that just restate the implementation. Run targeted checks while iterating, full gates once before shipping.

## Context

- Students are Russian or Arabic speakers learning English; lessons happen over Google Meet (recording must capture both sides — teacher + student audio).
- FaFo uses Mac + Firefox.
- Dev quirk: stale styles in dev → delete `.next` (Turbopack cache).
- Claude cloud sessions: environment **Omnica English**; quirks (proxy, `next dev --webpack`, WebSocket-free Convex commands) in MASTER_PLAN §4. Marketing files live in the separate repo `FaFo-0/omnica-english-marketing`, not here.
