# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

UK job application tracker. The full spec (data model, routes, build phases) is in `../PLAN.md`, outside this repo. Phase 0 (foundations) is done.

## Commands

```bash
npm run dev            # http://localhost:3000
npm run build          # prisma generate + next build
npm run typecheck      # next typegen + tsc (PageProps/LayoutProps are generated types)
npm run lint
npm run format         # prettier, sorts Tailwind classes
npm test               # vitest run
npx vitest run src/lib/format.test.ts   # one file
npx vitest run -t "BST"                 # tests matching a name
npm run db:migrate     # prisma migrate dev (needs DATABASE_URL)
npm run db:studio
```

## Versions that differ from older docs

- **Next.js 16** with `cacheComponents: true`. Middleware is now `src/proxy.ts`. Any component that reads `cookies()`, `searchParams` or the session must sit inside `<Suspense>`, or the build fails. Read `node_modules/next/dist/docs/` before using an unfamiliar API.
- **Prisma 7**: the client is generated into `src/generated/prisma` (import from `@/generated/prisma/client`, never `@prisma/client`). It needs the `@prisma/adapter-pg` driver adapter (see `src/lib/db.ts`). The DB URL lives in `prisma.config.ts`, not in the schema.
- **Auth.js v5** (`next-auth@beta`) with database sessions via the Prisma adapter. Providers: Google, plus Resend magic links.
- **shadcn/ui** uses the `base-nova` style on **Base UI** primitives, not Radix. Compose with `render={<Link />}`, not `asChild`. `cn` comes from the `cn` npm package (published by shadcn).

## Architecture rules

- **Auth:** `src/proxy.ts` only checks that a session cookie exists, for a quick redirect. Real authorisation is `requireUser()` from `src/lib/auth.ts`, called in every page, query and Server Action that touches user data. Read the session inside a Suspense'd child component, not at the top of a layout.
- **Dates and money:** use `src/lib/format.ts` only. Instants are `timestamptz`, shown in Europe/London. Calendar dates (e.g. closing date) are Postgres `date`, formatted in UTC. Money is integer pence. Vitest runs with `TZ=America/New_York` on purpose, so code that relies on the machine's time zone fails.
- **New signed-in routes** go under `src/app/(app)/` and must also be added to the matcher in `src/proxy.ts`.
- Use UK English in all UI text.
