# UK Job Tracker

Track job applications, interviews and follow-ups. Built for job seekers in the UK: DD/MM/YYYY dates, Europe/London time, GBP salaries.

**Stack:** Next.js 16 · TypeScript · Tailwind · shadcn/ui · Prisma 7 + PostgreSQL · Auth.js v5 · Resend

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and fill it in:
   - `DATABASE_URL`: a Postgres database, ideally in a London region (e.g. Neon, eu-west-2).
   - `AUTH_SECRET`: run `npx auth secret`.
   - `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`: Google Cloud OAuth client. Redirect URI: `http://localhost:3000/api/auth/callback/google`.
   - `AUTH_RESEND_KEY` / `EMAIL_FROM`: Resend API key. `onboarding@resend.dev` only delivers to your own Resend account email until you verify a domain.
3. `npm run db:migrate` to create the tables.
4. `npm run dev`, then open http://localhost:3000.

## Scripts

| Command                                    | What it does                     |
| ------------------------------------------ | -------------------------------- |
| `npm run dev`                              | Dev server                       |
| `npm run build`                            | Production build                 |
| `npm test`                                 | Unit tests (Vitest)              |
| `npm run typecheck`                        | Type-check                       |
| `npm run lint` / `npm run format`          | ESLint / Prettier                |
| `npm run db:migrate` / `npm run db:studio` | Prisma migrations / data browser |
