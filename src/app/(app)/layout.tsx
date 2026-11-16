import Link from "next/link";
import { Suspense } from "react";
import { requireUser, signOut } from "@/lib/auth";
import { AppNav, NavLinks } from "@/components/layout/app-nav";
import { DemoBanner } from "@/components/layout/demo-banner";
import { NotificationBell } from "@/components/layout/notification-bell";
import { UserMenu } from "@/components/layout/user-menu";
import { getNotifications } from "@/server/queries/reminders";

async function signOutAction() {
  "use server";
  await signOut({ redirectTo: "/" });
}

// Reads the session, so it streams in behind a Suspense boundary (Cache Components rule).
// Real access control lives in requireUser() calls in each page/query/action, not here.
async function AccountSlot() {
  const [user, notifications] = await Promise.all([requireUser(), getNotifications()]);
  return (
    <div className="flex items-center gap-1">
      <NotificationBell data={notifications} />
      <UserMenu user={user} signOutAction={signOutAction} />
    </div>
  );
}

/**
 * One grid, two arrangements:
 * - Phones: a single top bar (logo + nav on the left, bell + account on the right), then content.
 * - Desktop: a sidebar spanning the full height, a header above the content.
 * Columns use minmax(0, …) so wide content (the Kanban board) scrolls inside itself.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="relative grid min-h-full flex-1 grid-cols-[minmax(0,1fr)_auto] grid-rows-[auto_1fr] md:grid-cols-[14rem_minmax(0,1fr)] md:grid-rows-[3.5rem_1fr]">
      <a
        href="#main"
        className="bg-background focus-visible:ring-ring sr-only z-50 rounded-md px-3 py-2 text-sm font-medium focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus-visible:ring-2"
      >
        Skip to content
      </a>
      <aside className="col-start-1 row-start-1 flex min-w-0 items-center justify-between gap-2 border-b py-2 pl-3 md:row-span-2 md:flex-col md:items-stretch md:justify-start md:gap-4 md:border-r md:border-b-0 md:px-4 md:py-3">
        <Link href="/dashboard" className="shrink-0 px-2 font-semibold md:px-3">
          Job Tracker
        </Link>
        <Suspense fallback={<NavLinks />}>
          <AppNav />
        </Suspense>
      </aside>
      <header className="col-start-2 row-start-1 flex items-center justify-end border-b pr-3 pl-1 md:px-4">
        <Suspense fallback={<div className="bg-muted size-8 rounded-full" />}>
          <AccountSlot />
        </Suspense>
      </header>
      <main
        id="main"
        tabIndex={-1}
        className="col-span-2 row-start-2 min-w-0 px-4 py-6 outline-none md:col-span-1 md:col-start-2 md:px-8"
      >
        <Suspense>
          <DemoBanner />
        </Suspense>
        {children}
      </main>
    </div>
  );
}
