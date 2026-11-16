# UK Job Tracker

Track job applications, interviews and follow-ups. Built for job seekers in the UK: DD/MM/YYYY dates, UK time (BST-aware), GBP salaries, UK GDPR export and deletion.

**Stack:** Next.js 16 · TypeScript · Tailwind · shadcn/ui (Base UI) · Prisma 7 + PostgreSQL · Auth.js v5 · FullCalendar 7 · Recharts · Resend · Vercel Cron

## What it does

- **Applications:** table and Kanban board, search, filters and sorting in the URL, and a full status history.
- **Dashboard:** applications this week and month, response rate, a pipeline view, what needs attention, and upcoming interviews.
- **Interviews:** a calendar (month, week and list views), plus adding interviews to Google, Outlook or Apple Calendar via `.ics`.
- **Reminders:** automatic ones for closing dates, follow-ups and interview prep, plus your own. They appear in the app and in a daily email digest.
- **Your data:** download everything as a ZIP, or delete your account immediately.
- **Try the demo:** one click creates a private account with a sample job search. No sign-up, no email, and it's deleted after 24 hours.

## Local setup

1. `npm install`
2. Copy `.env.example` to `.env` and fill it in (comments in the file explain each value).
3. A database:
   - **Local, no Docker:** `npx prisma dev --detach --name uk-job-tracker`, then copy the TCP URL into `DATABASE_URL`. Also set `SHADOW_DATABASE_URL` to the next port and `DATABASE_POOL_MAX=1`; see `.env.example`.
   - **Hosted:** any Postgres. For UK GDPR, choose a London region (e.g. Neon `eu-west-2`).
4. `npm run db:migrate`, then `npx prisma db seed` for demo data (`demo@example.com`).
5. `npm run dev`, then open http://localhost:3000.

Without `AUTH_RESEND_KEY`, development emails are saved to `.outbox/` instead of being sent. Run the reminders job by hand with `npm run reminders:run`.

## Scripts

| Command                                    | What it does                                                   |
| ------------------------------------------ | -------------------------------------------------------------- |
| `npm run dev`                              | Dev server                                                     |
| `npm run build`                            | Production build                                               |
| `npm test`                                 | Unit tests (Vitest)                                            |
| `npm run test:e2e`                         | End-to-end and accessibility tests (Playwright, local DB only) |
| `npm run typecheck`                        | Type-check                                                     |
| `npm run lint` / `npm run format`          | ESLint / Prettier                                              |
| `npm run db:migrate` / `npm run db:studio` | Prisma migrations / data browser                               |
| `npm run reminders:run`                    | Run the reminders cron against the local server                |

The end-to-end tests build the app, start it on port 3100 and reseed the demo user. They refuse to run unless `DATABASE_URL` points at `localhost`.

## Before you launch

- [ ] **Database:** hosted Postgres in a London region (e.g. Neon `eu-west-2`). Vercel's build runs `prisma migrate deploy` automatically (`vercel-build` script).
- [ ] **Vercel environment variables (required):** `DATABASE_URL` (Neon's pooled string), `DIRECT_DATABASE_URL` (Neon's direct string, for migrations), `AUTH_SECRET`, `CRON_SECRET` and `APP_URL` (your address, no trailing slash). With just these, the site works through **Try the demo**.
- [ ] **Optional, for real accounts:** `AUTH_GOOGLE_ID` + `AUTH_GOOGLE_SECRET` (Google sign-in), and `AUTH_RESEND_KEY` + `EMAIL_FROM` (email sign-in links and reminder emails). The login page only shows the methods that are configured.
- [ ] **Google OAuth:** add `https://<your-domain>/api/auth/callback/google` as a redirect URI.
- [ ] **Resend:** verify your sending domain and set `EMAIL_FROM` to an address on it. Until then, Resend only delivers to your own account's email address.
- [ ] **Cron:** `vercel.json` runs the reminders job daily at 09:00 UTC, the most often the Hobby plan allows. On Pro you can make it hourly.
- [ ] **Legal pages:** fill in the highlighted placeholders in `/privacy` and `/terms` (who runs the service, contact address, your suppliers' regions and transfer safeguards, backup retention), and have them reviewed.
