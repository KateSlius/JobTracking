import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { AnchorButton } from "@/components/ui/link-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { devSignInLinks, latestDevSignInLink } from "@/server/email/dev-sign-in";

export const metadata: Metadata = { title: "Check your email" };

/** Development only (no Resend key): show the link that would have been emailed. */
async function DevSignInLink() {
  if (!devSignInLinks) return null;
  await connection();
  const link = await latestDevSignInLink();
  if (!link) return null;
  return (
    <CardContent className="flex flex-col gap-3">
      <p className="rounded-md bg-amber-100 px-3 py-2 text-sm text-amber-950 dark:bg-amber-900 dark:text-amber-50">
        <strong>Development mode:</strong> no email was sent because <code>AUTH_RESEND_KEY</code>{" "}
        isn&apos;t set. Here&apos;s the link for {link.to}:
      </p>
      <AnchorButton href={link.url}>Sign in</AnchorButton>
    </CardContent>
  );
}

export default function CheckEmailPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Check your email</CardTitle>
          <CardDescription>
            We&apos;ve sent you a sign-in link. It expires in 24 hours. If it hasn&apos;t arrived,
            check your spam folder or{" "}
            <Link href="/login" className="underline underline-offset-4">
              try again
            </Link>
            .
          </CardDescription>
        </CardHeader>
        <Suspense>
          <DevSignInLink />
        </Suspense>
      </Card>
    </main>
  );
}
