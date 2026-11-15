import Link from "next/link";
import { Suspense } from "react";
import { requireUser, signOut } from "@/lib/auth";
import { AppNav, NavLinks } from "@/components/layout/app-nav";
import { UserMenu } from "@/components/layout/user-menu";

async function signOutAction() {
  "use server";
  await signOut({ redirectTo: "/" });
}

// Reads the session, so it streams in behind a Suspense boundary (Cache Components rule).
// Real access control lives in requireUser() calls in each page/query/action, not here.
async function AccountSlot() {
  const user = await requireUser();
  return <UserMenu user={user} signOutAction={signOutAction} />;
}

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      <aside className="flex items-center justify-between gap-4 border-b px-4 py-3 md:w-56 md:flex-col md:items-stretch md:justify-start md:border-r md:border-b-0">
        <Link href="/dashboard" className="px-3 font-semibold">
          Job Tracker
        </Link>
        <Suspense fallback={<NavLinks />}>
          <AppNav />
        </Suspense>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-end border-b px-4">
          <Suspense fallback={<div className="bg-muted size-8 rounded-full" />}>
            <AccountSlot />
          </Suspense>
        </header>
        <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
