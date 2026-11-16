import type { Metadata } from "next";
import { LinkButton } from "@/components/ui/link-button";

export const metadata: Metadata = { title: "Account deleted" };

export default function GoodbyePage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-start justify-center gap-4 px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Your account has been deleted</h1>
      <p className="text-muted-foreground">
        Your applications, interviews, reminders and notes are gone. We&apos;ve emailed you to
        confirm. Good luck with the job search.
      </p>
      <LinkButton variant="outline" href="/">
        Back to the home page
      </LinkButton>
    </main>
  );
}
