# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

UK job application tracker. The full spec (data model, routes, build phases) is in `../PLAN.md`, outside this repo. Phases 0–3 are done: foundations, core CRUD, Kanban board and dashboard, interviews and calendar.

## Commands

```bash
npm run dev            # http://localhost:3000
npm run build          # prisma generate + next build
npm run typecheck      # next typegen + tsc (PageProps/LayoutProps are generated types)
npm run lint
npm run format         # prettier, sorts Tailwind classes
npm test               # vitest run
npx vitest run src/lib/salary.test.ts   # one file
npx vitest run -t "BST"                 # tests matching a name
npm run db:migrate     # prisma migrate dev; run `npm run db:generate` after (Prisma 7 no longer does it)
npx prisma db seed     # demo@example.com: 12 applications, an upcoming and a past interview, an overdue reminder; safe to re-run
npm run db:studio
```

### Local database

No Docker here. Use Prisma's embedded Postgres: `npx prisma dev --detach --name uk-job-tracker`, then `npx prisma dev ls` for ports. Its quirks:

- Every database name on a port is the same database, so `.env` needs `SHADOW_DATABASE_URL` pointing at the next port (the shadow server). Without it, `migrate dev` writes the shadow copy into your real data.
- It can't handle several connections at once: set `DATABASE_POOL_MAX=1`, or queries fail with `bind message supplies N parameters`.

## Versions that differ from older docs

- **Next.js 16** with `cacheComponents: true` and partial prefetching. Middleware is now `src/proxy.ts`. Anything that reads `cookies()`, `searchParams`, `params`, the session, or client hooks like `usePathname()`/`useSearchParams()` must sit inside `<Suspense>`, or the build fails. Read `node_modules/next/dist/docs/` before using an unfamiliar API.
- **Prisma 7**: the client is generated into `src/generated/prisma`. Import from `@/generated/prisma/client` on the server and `@/generated/prisma/enums` in client components (no runtime deps), never `@prisma/client`. It needs the `@prisma/adapter-pg` driver adapter (`src/lib/db.ts`). DB URLs and the seed command live in `prisma.config.ts`.
- **Auth.js v5** (`next-auth@beta`) with database sessions via the Prisma adapter. Providers: Google, plus Resend magic links.
- **shadcn/ui** uses the `base-nova` style on **Base UI** primitives, not Radix. Compose with `render={<Link />}`, not `asChild`. `cn` comes from the `cn` npm package (published by shadcn).

## Architecture

Request flow for user data: page (Server Component inside `<Suspense>`) → `src/server/queries/*` (reads) or form → `src/server/actions/*` (Server Actions) → `src/server/services/*` (writes, transactions) → Prisma.

- **Auth:** `src/proxy.ts` only checks that a session cookie exists, for a quick redirect. Real authorisation is `requireUser()` (`src/lib/auth.ts`). Every exported query and every Server Action calls it, and every Prisma query filters by `userId`. Services take `userId` as an argument and assume the caller checked. `requireUser()` calls `connection()` first, because Auth.js uses random values that Next rejects during partial prefetching.
- **Status changes:** only `changeStatus()` in `src/server/services/status.ts` changes `Application.status`. It writes a `StatusChange` row in the same transaction and fills `appliedOn` when an application moves past Saved. The edit form deliberately has no status field. The timeline, and later the funnel and response rate, read `StatusChange`.
- **Validation:** `src/lib/validation/application.ts` is the single zod schema for the form and the actions. It turns form strings into typed data: DD/MM/YYYY dates, `£45k`/`£500/day` salaries into pence plus a period, IR35 cleared unless the role is a contract, city cleared for remote roles. The form (`application-form.tsx`) only hides and shows fields. The server decides what is valid.
- **List state lives in the URL:** `src/lib/validation/filters.ts` parses and serialises `view` (table/board), `q`, `status`, `source`, `location`, `sort`, `dir` and `page`. Both the server query and the client `FiltersBar` use it. The board ignores `status`, sort and paging, because columns are statuses.
- **Kanban** (`kanban-board.tsx`, dnd-kit): a drop calls `moveApplicationAction` → `changeStatus()`, with an optimistic move via `useOptimistic` that snaps back on error. Mouse and touch drag the whole card (touch needs a press-and-hold so swiping scrolls). The keyboard drags from the grip button, where arrows jump whole columns via a custom coordinate getter.
- **Dashboard metrics** are pure functions in `src/lib/metrics.ts`, with the definitions tested there: response rate = heard back (Assessment/Interview/Offer/Rejected) ÷ reached Applied; the funnel counts "reached this stage or further", so it never widens; weeks start Monday in London. `src/server/queries/dashboard.ts` loads applications with their history and calls these.
- **Forms** use `useActionState` plus `useSubmitWithoutReset` (`src/lib/use-submit-without-reset.ts`). React 19 resets a `<form action>` after every submit, even a failed one, which silently desyncs controlled `<select>`s from the fields they show. Use the hook on any new form that can fail validation.
- **Interviews and time zones:** form times are London wall-clock times (`parseClockTime` accepts "14:30", "2:30pm" and so on), stored as UTC. `interviewToCalendarEvent()` (`src/lib/interview-event.ts`) is the single source for the `.ics` route (`/api/interviews/[id]/ics`) and the Google/Outlook links; it leaves out prep notes on purpose. Editing an interview bumps `icsSequence`, so re-imports update the event rather than duplicating it.
- **Calendar** (`/calendar`, FullCalendar **v7**: plugins are `@fullcalendar/react/daygrid` etc., don't install the v6 `@fullcalendar/*` packages). It runs in `timeZone="UTC"` and is fed London wall-clock strings with no offset (`toLondonWallIso`) plus a London `now`, so it shows UK time on any computer; it renders client-only. v7 renamed or dropped several v6 options (`buttonText` → `buttons`, `slotLabelFormat` → `slotHeaderFormat`, per-event `classNames` ignored, so set `color` instead). Theme colours are mapped in `globals.css` under `.jt-calendar`.
- **Charts** follow the dataviz skill: one validated accent hue, `--viz-accent`/`--viz-track` in `globals.css` (light and dark), bars ≤24px, a hover tooltip plus a "View as table" fallback. The funnel is an HTML meter list, not a chart library funnel.
- **Dates and money:** use `src/lib/format.ts` only. Instants are `timestamptz`, shown in Europe/London. Calendar dates (`closingDate`, `appliedOn`) are Postgres `date`, formatted in UTC; use `londonToday()` for "today". Money is integer pence. Vitest runs with `TZ=America/New_York` on purpose, so code that relies on the machine's time zone fails.
- **Companies, contacts and CV versions** are created on the fly from form text: companies are matched case-insensitively per user, and CV/cover letter labels are upserted.
- **New signed-in routes** go under `src/app/(app)/`, must be added to the matcher in `src/proxy.ts`, and get a sidebar entry in `app-nav.tsx` only once the page exists (Next prefetches nav links, so a missing page logs 404s).
- **`APP_URL`** (no trailing slash) is the public address used in calendar invites, and in emails from Phase 4.
- **Render purity:** lint forbids `Date.now()`/`new Date()` in components. Read the clock in queries, after `requireUser()` (which calls `connection()`); reading it earlier, even as a default argument, fails the build.
- **Layout gotchas:** wide content needs `min-w-0` on its flex parent, and a horizontal scroll container needs `relative`, or absolutely positioned children (e.g. `sr-only` labels) escape it and widen the page.
- Use UK English in all UI text.
