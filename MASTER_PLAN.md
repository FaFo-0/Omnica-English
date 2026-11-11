# Omnica English — Platform Reference

> **What:** **Omnica English** — online English academy platform (Russian/Arabic-L1 students learning English). Owner: Mustafa (FaFo).
> **Live:** https://omnicaenglish.com · Convex prod `valuable-loris-929` · Academy key `org_3DIbJAWeR5CjVaBRlB4AZXL1UpD`
> **Stage:** live in production (Nov 2026: 3 students, 2 teachers); target ~50. Don't build for scale that doesn't exist.
> **Business rules:** [POLICY.md](POLICY.md) is the single source of truth for payments, cancellation, no-show, pauses, trials. This file never restates policy — it links to it.
> **AI behavior rules:** [CLAUDE.md](CLAUDE.md).

---

## 1. How work happens here (FaFo's workflow — respect it)

Workflow, shipping (preview → "ship") and AI rules live in [CLAUDE.md](CLAUDE.md) — the single rules file for every AI (AGENTS.md points to it). Don't refactor unrelated code; no over-engineering.

**Standing technical rules (each one earned by a real bug):**

| Rule | Why |
|---|---|
| **`useQuery` comes from `convex-helpers/react/cache/hooks`, not `convex/react`.** Plain `useQuery` unsubscribes on unmount, so every tab switch refetched from scratch and the UI sat empty for a beat. | Fixed 2026-07-29. |
| **Never push server content back into a live TipTap editor.** The parent saves on a debounce and the server echoes a new object; applying it overwrites whatever was typed since. Ignore the echo, ignore updates while focused. | "Text deletes itself while writing" — fixed 2026-07-29. |
| **Never `new Date(date + "T" + time)` without a timezone.** Stored schedule times are **academy wall-clock** (anchor `Asia/Almaty`, no DST), not UTC. Convert via `wallTimeToMs` / `zonedToInstant` (`convex/lib/time.ts`, `src/lib/tz.ts`). | Same bug fixed 7+ times (crons, ICS, booking notice, slot filters, student dashboard). |
| **Reading model is locked:** a word is on the student's list (green) or it is prose. Never reintroduce per-word statuses (known/ignored/new). One `ReadingView` component for all portals — never fork it. | LingQ-style statuses built then removed 2026-07-29 as UX noise. |
| **The word list IS the flashcards.** `srsCards` is the single source; My Words, study queue, reading tint all read it. A card's answer is the translation into the student's L1 (`users.getLearnerLocale` resolves it: onboarding L1 → UI locale → null). | Two parallel systems drifted; unified 2026-07-29. |
| **"Points" are dead as a user-facing word.** Students see **lessons** ("8 lessons left"). Internals still use point tables at 1 lesson = 1 unit. | FaFo decision 2026-07-14. |
| Tailwind `inset-inline-*`/`inset-x-*` utilities generate no CSS in this setup — use inline `insetInlineStart/End` for absolute overlays. | Calendar bands collapsed to 2px. |
| Use logical CSS properties (`ms-`, `me-`, `ps-`, `pe-`) for future RTL. English first, then Russian, then Arabic. | Arabic market. |
| **The name is always Omnica English** — UI, copy, notifications, metadata, docs, code, repo. "OmniClass" is retired. | FaFo decisions 2026-10-17, 2026-11-08. |
| Never hardcode tenant branding — colors/name live in `tenantSettings`. | Multi-tenant. |
| All Convex access via `convex/lib/tenant.ts` (`requireTenant` / `requireTenantPermission` / `tenantTable`) — no raw cross-org `ctx.db` in feature code. | Tenancy isolation. |
| If style edits don't show in dev: delete `.next` (Turbopack stale cache). | Hit 2026-07-18. |

---

## 2. Architecture

Thin Next.js 16 shell (App Router, Turbopack) over **Convex**. Three portals — Student / Teacher / Admin — use **Clerk identity/session auth only**; application roles are held in Convex. Every row remains scoped by `organizationId`, using the opaque academy key exported as `ACADEMY_ID` from `convex/lib/tenant.ts`. Styling: Tailwind v4 + shadcn/ui; brand = yellow `#FFCA00` canvas, purple `#6716A4` primary, dark-purple sidebar; font Inter. STT: Soniox v4 (`@soniox/speech-to-text-web`). LLM: DeepSeek V4.1 Flash (`deepseek/deepseek-v4.1-flash`) via OpenRouter (`OPENROUTER_API_KEY`), prompts per-org in `promptConfigs` with code fallbacks. i18n: next-intl, locales **en + ru + ar + kk** (`src/i18n/config.ts`); Arabic sets `dir="rtl"` on `<html>`. Catalogue in `messages/` — all four files carry every key the student portal uses. Nav labels resolve per-item key against the `nav` namespace with the English config label as fallback.

**Key directories**

```
src/app/(student|teacher|admin|onboarding)   pages per portal
src/components/  shared/ (sidebar, nav, pills) · library/ (ReadingView, WordLookupPopover)
                 calendar/ (SlotCalendar, StaffCalendar, CalendarAgenda, calendarShared) · homework/ (HomeworkEditor)
                 recording/ (RecordingPanel) · ui/ (shadcn)
src/lib/         auth · tz · timeFormat · transcript · soniox/ · ai/ · brand/ · format/
convex/          one file per domain (see §4) · lib/(tenant|policy|time|sm2|permissions|defaultPrompts)
scripts/dev-login.mjs   messages/   POLICY.md
```

---

## 3. Platform inventory — what exists today

### Student portal
| Page | What it does |
|---|---|
| `/student` | Dashboard: next-lesson card (real instants, viewer tz, Meet button only when link exists; date shown when >2h away), study-due card, stat cards (completed lessons, words, cards reviewed, lessons left), streak in header, recent published lessons. |
| `/student/lessons` (+`[id]`) | Lesson **history** from schedule events — Done / Upcoming / You missed it / Cancelled, in the student's timezone, filters + search; rows with published notes open them (AI summary, vocabulary, flashcards, self-graded quiz). |
| `/student/library` (+`/work/[workId]/[unitId]`) | Browse/Recent text/link catalogue with compact search, collapsible filters, sorting, 24-item pages and reading times. Opening chapters prepare before publication; later chapters prepare only when opened. Shared reader preloads contextual ru/ar/kk vocabulary; saved forms share green tint. Continue reading, chapter navigation and explicit completion. Links may have attached text/transcripts. |
| `/student/study` | Hub: open homework, flashcards due (Start), reading recommendations. Session: SM-2 flip cards, translation-first backs, Again re-drills in-session (first rating = the recorded one), Space/1-4 keyboard, 60/session + 15 new/day caps; done screen shows unique cards + real streak. |
| `/student/vocabulary` "My Words" | The one word list: search, not-studied/learning/learned filters (learned = SM-2 interval ≥ 21d), inline translation edit, remove, due badge, "Study N due". |
| `/student/homework` (+`[id]`) | Full homework history (to-do / waiting review / completed w/ score) with due-date pills + standalone editor page: ten workbook exercise formats, including matching and word ordering; saved answers → submit → per-question teacher feedback. |
| `/student/calendar` | Direct day/week slot calendar, green bookable starts, concise two-cell confirmation, finite weekly repeats, policy-aware cancel/move, viewer timezone. Rules: [POLICY §5](POLICY.md#5-calendar--scheduling). |
| `/student/achievements` | Gallery with real progress bars, closest-to-done first; unlocks on open + after any qualifying event, with a notification. |
| `/student/billing` | Lesson packs with real catalogue prices (local currency where set) + balance and next expiry. **How to pay** explains that the academy contacts the student on WhatsApp to arrange payment, with a tenant-configured WhatsApp contact link. **Request** notifies every admin. |
| `/student/profile` | Reached from the avatar menu (Clerk popup carries a Profile link next to Manage account / Sign out). Shared `AccountCard` (name / timezone / 12-24h / phone; language for translations is shown but staff-set), lesson balance linking to packs, ICS subscribe URL. |
| `/student/book` | Legacy → redirects to calendar. |
| `/onboarding/student` | 3-step wizard: required name, age, contact + **timezone** (auto-detected, editable) · CEFR (described, not bare codes) + **language for translations** (ru/ar/kk, Russian preselected) + optional goal + interests · availability (days/times chips) + referral + **POLICY §8 recording consent** → trial grant. |
| `/onboarding/teacher` | 3-step wizard: timezone + phone · **meeting room** (Meet link) · weekly working hours → writes real `teacherVacancies`. Gated like the student flow. |

### Teacher portal
| Page | What it does |
|---|---|
| `/teacher` | Dashboard: setup checklist (self-completing), today's classes, recent recordings, this-month earnings (recorded payments plus outstanding payroll), stat cards. |
| `/teacher/sessions` | Upcoming (start window: T-10 → 30min after end; Resume if already live) + Past. Start session creates real dated event if unscheduled (`createOneTimeLesson`). Inline rename. |
| `/teacher/sessions/[id]` | Review: transcript+notes, AI summary, editable vocabulary table (→ auto-flashcards on publish), workbook builder: manual forms, bulk questions, section/question duplication and ordering, student preview, AI drafts by level/objective/type, and pasted workbook conversion. Publish requires summary+vocab approved. |
| `/teacher/sessions/[id]/live` | Full-screen live room: Soniox STT (mic / mic+Meet tab / upload), stable Teacher/Student speaker labels, pause, timer; tabs: Reading / Quiz-from-transcript / AI conversation questions / auto-saved notes; share windows (`/teacher/share/quiz|reading`) for Meet screen-share; no-show flow; discard (= un-start, POLICY-correct); End → review. |
| `/teacher/students` (+`[id]`) | Roster w/ level, lessons left, next lesson, last seen, homework flags. Detail: balance/expiry, lesson stats, profile (incl. one-click **language for translations** setter — sweeps untranslated cards), homework counts, recent lessons, live local clock + flag. |
| `/teacher/library` (+`/work/[workId]/[unitId]?studentId=`) | Same paginated catalogue and prepared reader; assigned-student picker saves to their L1 vocabulary and links to searchable Student vocabulary on the student profile. Live lesson/share pickers also search/filter. |
| `/teacher/calendar` | Direct dated slot editing by click/drag with immediate save and Undo; protected bookings, confirmed lesson drag/move, Add lesson, and full-week promotion to regular weekly hours. Faded past cells edit a tab-saved pattern draft. More holds time off/profile/preferences; per-user Start at Auto/manual. Rules: [POLICY §5](POLICY.md#5-calendar--scheduling). |
| `/teacher/guide` | Onboarding handbook (setup, running a lesson, homework, library); explains Recently added sorting and that Recommended matches student topic tags to onboarding interests only in the student catalogue. |
| `/teacher/profile` | Shared `AccountCard` + assigned students / open hours / upcoming stat row, permanent meeting room (warns while unset), **introduction + IELTS toggle** (what students read before lesson one), provisional payable this month (POLICY §4), roster shortcut and links to calendar + sessions. Reached from the avatar menu. |
| `/onboarding/teacher` | Four-step wizard every invited teacher lands on: name / app language / timezone / clock / phone → meeting room + **POLICY §8 recording consent** → introduction + IELTS → weekly working hours (written as ordinary vacancies). Translated en/ru/ar. |

### Admin portal
| Page | What it does |
|---|---|
| `/admin` | Metrics + real P&L from ledger (`reports.monthlyStats`) + a compact needs-attention card (counts only, links out). |
| `/admin/staff/[id]` | An admin's own page: contact, live local clock, and the **permission list actually in force** (role defaults vs a custom override). Only the platform owner can edit another admin's access; the owner's own access is not editable from inside a tenant. |
| `/admin/attention` | POLICY §7 triage in full: unpaid lessons · credits expiring · gone quiet · never booked. Each row links where the admin acts and can be dismissed for 30 days (restorable at the bottom). |
| `/admin/people` | Students/Instructors tabs: **whole row opens the profile** (student → `/admin/students/[id]`, instructor → `/admin/teachers/[id]`; inline controls stop the bubble), pause/resume, teacher assignment, **Calendar** (opens that teacher’s shared calendar), invites. Admins detects duplicate platform-owner identities and lets the active owner **retire** the duplicate (reversible access removal; historical records remain). Instructor rows show timezone + whether a meeting room is set. |
| `/admin/sessions` (+`/deleted`) | Org-wide sessions (with teacher + student columns) + soft-delete restore. |
| `/admin/library` → `/admin/library/works` | Text, HTTPS link or both; editable stable chapters, draft preview. Publication waits for the opening chapter’s contextual ru/ar/kk vocabulary; later chapters prepare only when opened, with dictionary lookups available while preparation runs. `Prepare vocabulary` / `Re-prepare all` / `Stop` are explicit operator controls. Agent terminal imports: [docs/LIBRARY_IMPORT.md](docs/LIBRARY_IMPORT.md); no OCR or automatic YouTube transcripts. |
| `/admin/calendar` | Navigable all-teacher agenda; selected-teacher assignment/move/cancel and shared direct slot editing. Staff may use direct half-hour assignment; rules: [POLICY §5](POLICY.md#5-calendar--scheduling). |
| `/admin/billing` | **Overview** (month P&L from the ledger) · **Payroll** (per-teacher owed → Mark paid) · **Expenses** (manual costs + recurring reminders) · Balances · Packs (region-grouped catalog, editor, seed, pack-aware grant) · **How students pay** (Kaspi number/name/QR shown to students) · **Money ledger** · Lesson ledger (`pointTransactions`). |
| `/admin/settings` | Branding (name, colour, **real logo upload** → Convex storage → sidebar mark) + feature toggles (Achievements/Library gate the student sidebar; the other three say "not enforced yet") · teacher invite link (copy/rotate) · **AI prompt manager with a working editor** (model / temperature / max tokens / system + user prompt, per-org upsert, reset to the built-in) · **achievements create/edit/delete** · read-only scheduling rules from [POLICY](POLICY.md), without obsolete editable limits. |
| `/admin/scheduling/requests` | Pending reschedule queue — reached from the dashboard card and the calendar subtitle. |
| `/admin/students/[id]` | Shared `StudentDetail`, with admin-only **Clear test lesson history**: preview cancelled/past one-to-one lessons, confirm by student email, remove them from history/unpaid payroll and correct recorded test payments plus their ledger entries. Sessions move to Deleted sessions; account, future/live lessons, balance, vocabulary and homework remain. |
| `/admin/teachers/[id]` | Teacher operating view, opened from the Instructors name: contact incl. **WhatsApp deep link + their live local clock**, timezone/Meet room, assigned students (balance + next lesson), usual weekly hours and dated next-14-day openings, provisional payable (POLICY §4 rule), reliability counts, time off w/ acknowledge, calendar link, recent sessions. Calendar button deep-links `/admin/calendar?teacher=`. |
| `/admin/profile` | Shared `AccountCard` + academy counts (teachers / students / lessons delivered), quick links, and a real access panel (role, academy, academy tz, member since). Reached from the avatar menu. |

### Backend systems (`convex/`)
| System | Files | Behavior |
|---|---|---|
| Tenancy & auth | `lib/tenant.ts`, `lib/permissions.ts`, `users.ts` | Academy-scoped everything via the opaque `ACADEMY_ID`; Clerk supplies identity/session only, while Convex owns roles and per-user permission overrides. `getLearnerLocale`, `setStudentL1`. Duplicate identity retirement blocks sign-in and preserves referenced history. |
| Calendar & scheduling | `calendar.ts`, `calendarAvailability.ts`, `schedule.ts`, `vacancies.ts`, `scheduleCron.ts`, `lib/policy.ts`, `lib/time.ts` | Half-hour availability cells coalesce in weekly `teacherVacancies`, with explicit date `slotExceptions`, atomic per-gesture deltas and actor-owned Undo receipts. Time off masks dated edits; removing it restores them. Atomic overlap checks for teacher/student; finite dated plans and idempotent confirmation. Legacy range/copy-week/direct schedule writers retired; recurring materializer remains retired. Reminder/no-show and pause-resume crons remain. Rules: [POLICY](POLICY.md). |
| Lesson balance | `points.ts`, `billing.ts` | Lesson packs → `pointGrants` (60-day expiry from first use, POLICY §2), FIFO spend at booking, refunds per policy, full ledger. |
| Live lesson & AI content | `lessons.ts`, `lessonContent.ts`, `inLessonQuiz.ts`, `lessonAudio.ts`, `ai.ts`, `soniox.ts`, `promptConfigs` | Transcript → summary/vocab/flashcards/quiz via OpenRouter; publish pushes vocab as SRS cards; audio backup to storage. |
| Reading & word bank | `libraryWorks.ts`, `libraryPreparation.ts`, `libraryImport.ts`, `library.ts` | Revision-checked, resumable contextual vocabulary prepares the opening chapter before publication and later chapters on demand. Large text lives in `libraryUnitBodies`; navigation, progress and queue checks read small `libraryUnits` metadata. Imports upsert one indexed chapter; unchanged text preserves preparation. Preparation allows 100 model attempts/academy/UTC day; recovery runs every 15 minutes. Shared reader loads results with the chapter; dictionary/MyMemory remain missing-entry fallbacks. Stable imports and chapters, optional external links, owner-scoped progress. |
| SRS / word list | `srs.ts`, `lib/sm2.ts` | One default deck per student; add is idempotent per word; SM-2 with reviewer-local dates; 60/session + `NEW_CARDS_PER_DAY=15` caps; `listMyWords` (state derived: new/learning/learned), `getWordSet` (paints reading), edit/remove. |
| Homework | `homework.ts`, `homeworkAi.ts`, `nodes.ts` | Draft → assign → submit → review; auto-grading (fill-blank, choice) + teacher overrides; answer keys stripped server-side pre-review; student writes merge answers only. **`dueAt` defaults to the student's next lesson** (POLICY §10 defines the deadline that way) — stored as a real instant, automatic deadlines follow booking/move/cancel/reassignment; teacher overrides or explicit clears via `setDueDate` remain fixed. |
| Notifications | `notifications.ts`, `notificationDigests.ts`, `telegram.ts`, `convex/lib/notificationRegistry.ts` | Registry-validated kind+payload rows → human sentences (student copy also ru/ar/kk); one registry for bell, Telegram and destinations. Bell in all portals. Cancellations carry who they are for (teacher can't / student asked / academy) and batch into one notice per student. Hourly digest cron: teacher 08:00 agenda and student 18:00 study reminder (Telegram only), homework due <24h, student out of lessons (admin). Members may optionally link a Telegram private chat via a single-use profile code; the outbox cron delivers new notifications (including Meet links) with direct Omnica English buttons, bounded retries, and durable non-sensitive failure state. Academy setup: `docs/TELEGRAM_NOTIFICATIONS.md`. |
| Gamification | `achievements.ts`, `streaks.ts`, `study.ts` | Study sessions + quiz attempts recorded; both bump the streak (`bumpStreak`, student-local dates) and run `evaluateAchievements` — recomputes all five counters (completed lessons, reviews, perfect quizzes, longest streak, learned words) and unlocks + notifies anything newly crossed. Idempotent; `syncMine` catches up on page open. |
| Onboarding & lifecycle | `onboarding.ts`, `retention.ts`, `maintenance.ts` | Student form + trial grant; admin attention signals; batched data-wipe helper (used for 2026-07-23 pre-launch reset). |
| ICS | `http.ts` (`/ics?token=`) | Per-user token feed, correct UTC conversion, Meet link as LOCATION. |
| Dev/CI helpers | `seed.ts`, `maintenance.ts` (`_wipeOldData` / `_wipeLibrary` / `_deleteSeedUsers` / `_resetStudent`), `schedule:seedTestEvent`, `homework:_seedCli` | Internal-only; seed a tenant, reset dev data, author test rows. Watch for seed drift vs schema. |

### Data model (one line per table — full shapes in `convex/schema.ts`)
`tenantSettings` (brand/policies/trial/currencies) · `users` (role, teacherId, tz, timeFormat, pause fields, meetLink, icsToken, reversible identity retirement) · `lessons` + `lessonVocabulary/Flashcards/QuizQuestions` + `inLessonQuizDrafts` · `libraryMaterials` (legacy) · `libraryWorks` / `libraryUnits` / `libraryUnitBodies` / `libraryVocabularyBatches` / `libraryPreparationUsage` (UTC attempt allowance) / `libraryProgress` · `libraryWordLookups` (shared word bank: translations per language, baseForm, isValid) · `srsDecks` / `srsCards` (translation, translationLocale, firstReviewedAt, SM-2 fields) / `reviewLogs` · `scheduleEvents` (audit: cancelledBy/At/Charged, rescheduledBy, recurringWeekKey) · `teacherVacancies` / `slotExceptions` / `recurringBookings` · **`packFamilies` / `packs`** (the commercial catalogue: one row per pack, one price, optional sale price) / `billingOrders` / `pointGrants` / `pointTransactions` / `financeEntries` · **retired, readable history only:** `billingPlans` / `billingPlanVersions` / `billingPlanBenefits` / `billingDiscounts` / `billingDiscountEligibleStudents` / `billingDiscountRedemptions` · `homework` · `notifications` · `studentOnboarding` (incl. l1) / `studentProfiles` / `studentPauses` · `achievements` / `studentAchievements` / `streaks` / `studySessions` / `quizAttempts` · `expenses` / `exchangeRates` · `certificateTemplates` / `issuedCertificates` (schema only, no UI) · `teacherInvites` / `permissionRequests` / `promptConfigs` / `rescheduleRequests` / `studentRescheduleQuota` / `makeupCredits` / `scheduleEnrollments` (groups — schema only).

---

## 4. Deployment & dev

| Piece | Value |
|---|---|
| Vercel | project `omnica-english`, team `fafo-s-projects`. `master` = production (omnicaenglish.com); every other branch gets a login-protected preview URL wired to dev Convex + dev Clerk. Old `next-js-omni-class.vercel.app` 308-redirects to the apex via Vercel domain settings. |
| Convex prod | `valuable-loris-929` — **manual `npx convex deploy` required for every `convex/` change** (no `CONVEX_DEPLOY_KEY` in Vercel). |
| Convex dev | `quixotic-quail-572` (`npx convex dev`). |
| Clerk | App **Omnica English**. Production instance (`ins_3Jzpg…`) serves omnicaenglish.com; development instance `secure-husky-22.clerk.accounts.dev` serves localhost, previews and QA. Identity/session provider only; the `convex` JWT template has no organization claims. |
| Env — Vercel | `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CONVEX_SITE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`. |
| Env — Convex prod | `CLERK_JWT_ISSUER_DOMAIN`, `OPENROUTER_API_KEY`, `SONIOX_API_KEY`. |
| Reusable localhost QA | `npm run qa:setup` reuses fictional admin/teacher/Russian-student/Kazakh-student actors and populates dev fixtures. `npm run qa:replenish` restores credits/due cards without deleting history. |
| AI browser login | `node scripts/dev-login.mjs admin\|teacher\|student\|student-kk` writes a private five-minute ticket file. Use only localhost and dev `quixotic-quail-572`; identities listed in `scripts/qa-config.mjs`. |
| Preview testing (FaFo) | Every non-`master` branch → `omnica-english-git-<branch>-fafo-s-projects.vercel.app` (Vercel login required; dev Convex + dev Clerk). Sign-in page and a floating **Test as…** chip give one-tap Admin / Teacher / Student RU / Student KK = the QA actors (`src/lib/previewLogin.ts`, `/api/preview-login`). Locked off production three ways (VERCEL_ENV, `sk_test_` key, dev Convex URL; `tests/previewLogin.test.ts`). Branch backend → dev via `npm run push:dev`. |
| Claude cloud sessions | Environment **Omnica English** (personal) allowlists Convex dev/prod, Clerk, Fonts, Vercel; its setup script runs `npm ci` and writes a non-secret `.env.local`. Clerk secret key + Convex access token are proxy-injected network secrets (local values are placeholders). Quirks: prefix Node commands that call APIs with `NODE_USE_ENV_PROXY=1` (scripts, `next dev`); run `next dev --webpack` (Turbopack fails on Google Fonts here); Convex CLI commands needing WebSockets (`convex data`, `function-spec`, `env list`, `dev` watch) hang — `convex run --push`, `qa:setup` and deploys use HTTP. Playwright: launch with `proxy: { server: HTTPS_PROXY, bypass: 'localhost' }`. Vercel CLI: token is proxy-injected; pass `--token proxyinjected` (placeholder; dashes rejected), e.g. `vercel ls`, `vercel logs`. |

---

## 5. Known issues (open only — delete an item when it's fixed; history goes to docs/CHANGELOG.md)

- **Arabic legal pages:** `/?lang=ar` homepage works; privacy/terms still fall back to English.
- **Teacher and admin portals are English-only.** Student portal, teacher onboarding and billing are translated (en/ru/ar/kk). Lesson content, AI summaries and definitions stay English by design.
- **Pack names repeat the lesson count** (`4 lessons` / `8 lessons`…), so cards say it twice. Data fix only: rename packs in Admin → Billing.
- **No admin UI for permanently deleting an account.** Today: Remove access (restorable) and Clear test lesson history; permanent purge is operator-only (`maintenance:_purgeAccountData`, dry run first). Decide whether to build a guarded admin action.
- **Sessions "View" routes into teacher paths** from the admin side.
- **Library:** no PDF/audio upload.
- **Settings toggles with no effect yet:** Gamification, Live Quiz Generation, Payments save but nothing reads them.
- **Legacy vocabulary rows missing definitions:** cleanup is implemented but deliberately not run (needs `DELETE_MISSING_DEFINITIONS`; pre-2026-07-29 rows only).
- **Planned, not built:** groups, certificates. Any payment-provider integration needs a new approved design.
- **Tech debt:** transcript passed via a global `window` bridge on live/review pages; legacy `any` types. Repo-wide lint baseline ~263 findings (2026-09-08) — don't mass-fix; fix what you touch.

QA: reusable dev actors (§4) and [docs/MANUAL_QA_RUNBOOK.md](docs/MANUAL_QA_RUNBOOK.md). Billing model reference: [docs/BILLING.md](docs/BILLING.md).

---

## 6. Product decisions already made (don't relitigate)

Reading = collecting into one word list (no per-word statuses) · flashcards drawn only from the list, translation-first, 15 new/day · lessons not points · v1 = 1-on-1 online lessons only (activity types return post-v1) · Google Meet links manual (OAuth removed) · one unified calendar, availability painted not scheduled · finite repeat patterns are the booking orchestration · reschedule ≠ cancel; consequences always shown before confirm · English definitions v1, learner-L1 translations automatic · no auto student-lifecycle statuses (admin attention list instead, POLICY §7) · certificates/groups deferred until FaFo asks · Reports tab removed (folded into Students). · mobile: keep both hamburger drawer (all destinations) and bottom nav (top 4); if calendar space is tight, auto-hide on scroll rather than removing either.

---

## 7. Change Log

Moved to [docs/CHANGELOG.md](docs/CHANGELOG.md) (newest first). Add an entry there when work lands, tagged `[Claude]` / `[DeepSeek V4 Pro]` / `[AI-Name]`.
