# Omnica English — AI Instructions

Online English academy **Omnica English** (omnicaenglish.com) — website, student/teacher/admin portals, one codebase. Owner: Mustafa (FaFo). The old internal name "OmniClass" is retired; don't reintroduce it.

## Files that matter

| File | Purpose |
|---|---|
| `MASTER_PLAN.md` | **Read first.** Platform reference: what exists, standing rules, known-issues queue, deployment. |
| `POLICY.md` | Business policy source of truth (payments, cancellation, no-show, pauses, trials). Never restate it elsewhere — link to it. Don't edit unless FaFo changes policy. |
| `CLAUDE.md` | This file — AI behavior only. |
| `.env.local` | API keys. Never commit or expose. |

## Workflow (FaFo's — do not impose your own)

1. **No phases, no steps, no roadmaps, no audit reports.** FaFo opens a page, dumps what he wants changed, you change it. Make routine calls yourself; ask only when readings genuinely diverge.
2. **Preview, then ship.** Live site has real students. Work on a branch: commit, `npm run push:dev` if `convex/` changed (uploads the branch backend to dev Convex), push the branch. Vercel builds a login-protected preview wired to dev Convex + dev Clerk with one-tap **Test as…** role buttons — send FaFo the branch preview link (`omnica-english-git-<branch>-fafo-s-projects.vercel.app`). When FaFo says **ship**: `npx convex deploy` first (backend does NOT auto-deploy; new UI must never run against old functions), then merge to `master` and push (Vercel builds production). Flag destructive schema changes before shipping. FaFo may say "ship directly" for tiny copy/style fixes.
3. Build now, test at the very end. Mobile pass dead last. i18n fix deliberately last.
4. Verify your work in the browser (`node scripts/dev-login.mjs [role]` mints a login URL) rather than asking FaFo to check.
   **Reusable QA:** use `npm run qa:setup`, then `node scripts/dev-login.mjs admin|teacher|student|student-kk`; `npm run qa:replenish` restores test credits/due cards without deleting history. Reuse these fictional actors and fixtures, never recreate them or use production for routine QA. See MASTER_PLAN §4/§5 for isolation, coverage and external-service limits.
5. When work lands: update MASTER_PLAN §5 (known issues) and §7 (change log). **Attribution mandatory** — tag change-log entries `[Claude]` / `[DeepSeek V4 Pro]` / `[AI-Name]`.
6. Keep MASTER_PLAN minimal and organized — update the relevant section in place, never scatter.

## Tech stack (locked — discuss before changing)

Next.js 16 (App Router, Turbopack) · Tailwind CSS v4 + shadcn/ui · **Convex** (all data; org-scoped via `convex/lib/tenant.ts`) · **Clerk Organizations** (auth; JWT template `convex`) · Soniox v4 STT · OpenRouter LLMs · next-intl (en/ru/ar) · Inter font · Lucide icons. Convex function conventions: `.claude/rules/convex-rules.md`.

## Hard rules (each earned by a real bug — details in MASTER_PLAN §1)

- **Never `new Date(date + "T" + time)` without a timezone.** Stored times are academy wall-clock (Asia/Almaty). Use `wallTimeToMs` / `zonedToInstant`.
- **Reading model locked:** word on the student's list (green) or plain prose. No per-word statuses. One shared `ReadingView` for all portals.
- **`srsCards` is the one word list** — flashcards, My Words, reading tint all derive from it. Card answers = translation into the student's L1 (`users.getLearnerLocale`).
- **Say "lessons", never "points"** in any user-facing copy.
- Logical CSS properties (`ms-`/`me-`/`ps-`/`pe-`) for future RTL. No hardcoded tenant branding — `tenantSettings` owns it.
- No over-engineering. Pre-launch, ~50 students target — build for that.

## Context

- Students are Russian or Arabic speakers learning English; lessons happen over Google Meet (recording must capture both sides — teacher + student audio).
- FaFo uses Mac + Firefox.
- Dev quirk: stale styles in dev → delete `.next` (Turbopack cache).
