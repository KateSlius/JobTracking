import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { signIn, signInMethods } from "@/lib/auth";
import { DemoButton } from "@/components/marketing/demo-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = { title: "Sign in" };

const AFTER_SIGN_IN = "/dashboard";

async function signInWithEmail(formData: FormData) {
  "use server";
  await signIn("resend", { email: formData.get("email"), redirectTo: AFTER_SIGN_IN });
}

async function signInWithGoogle() {
  "use server";
  await signIn("google", { redirectTo: AFTER_SIGN_IN });
}

// Auth.js redirects back here with ?error=<code> when sign-in fails.
const ERROR_MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked:
    "That email is already linked to another sign-in method. Use the method you signed up with.",
  Verification: "That sign-in link has expired or has already been used. Request a new one.",
};

async function SignInError({
  searchParams,
}: {
  searchParams: PageProps<"/login">["searchParams"];
}) {
  const { error } = await searchParams;
  if (!error) return null;
  const code = Array.isArray(error) ? error[0] : error;
  return (
    <p role="alert" className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
      {ERROR_MESSAGES[code] ?? "Something went wrong signing you in. Please try again."}
    </p>
  );
}

function Or() {
  return (
    <div className="text-muted-foreground flex items-center gap-3 text-xs">
      <Separator className="flex-1" />
      or
      <Separator className="flex-1" />
    </div>
  );
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  // Only offer what this deployment can do: no email form without Resend, no Google button
  // without OAuth credentials. The demo always works.
  const { email, google } = signInMethods;
  const description =
    email && google
      ? "We'll email you a link, or you can use Google."
      : email
        ? "We'll email you a sign-in link."
        : google
          ? "Sign in with your Google account."
          : "Account sign-in isn't set up on this site yet. Try the demo instead.";

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Sign in</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Suspense>
            <SignInError searchParams={searchParams} />
          </Suspense>

          {email && (
            <form action={signInWithEmail} className="flex flex-col gap-3">
              <Label htmlFor="email">Email address</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
              <Button type="submit">Email me a sign-in link</Button>
            </form>
          )}
          {email && google && <Or />}
          {google && (
            <form action={signInWithGoogle}>
              <Button type="submit" variant="outline" className="w-full">
                Continue with Google
              </Button>
            </form>
          )}
          {(email || google) && <Or />}
          <DemoButton size="default" className="w-full" />
          <p className="text-muted-foreground text-center text-xs">
            By continuing you agree to the{" "}
            <Link href="/terms" className="underline underline-offset-4">
              terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline underline-offset-4">
              privacy policy
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
