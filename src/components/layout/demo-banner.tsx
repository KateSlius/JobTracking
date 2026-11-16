import { requireUser } from "@/lib/auth";

/** Shown at the top of every signed-in page for "Try the demo" accounts. */
export async function DemoBanner() {
  const user = await requireUser();
  if (!user.isDemo) return null;
  return (
    <p className="mb-6 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-50">
      <strong>You&apos;re exploring a demo account.</strong> The data is made up and private to you.
      Change anything you like: it&apos;s all deleted after 24 hours. Emails are switched off.
    </p>
  );
}
