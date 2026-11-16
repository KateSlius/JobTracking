import "server-only";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { redirect } from "next/navigation";
import { cache } from "react";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { devSignInLinks, sendDevSignInLink } from "@/server/email/dev-sign-in";

// Env vars read automatically by Auth.js:
// AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, AUTH_RESEND_KEY
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "database" },
  providers: [
    Google,
    Resend({
      from: process.env.EMAIL_FROM ?? "Job Tracker <onboarding@resend.dev>",
      // Local development without a key: the link goes to .outbox and the check-email page.
      ...(devSignInLinks ? { sendVerificationRequest: sendDevSignInLink } : {}),
    }),
  ],
  pages: {
    signIn: "/login",
    verifyRequest: "/login/check-email",
  },
});

export type CurrentUser = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  /** A "Try the demo" account: never emailed, deleted after 24 hours. */
  isDemo: boolean;
};

/** Demo accounts use the reserved .invalid domain, so they can never receive email. */
export const DEMO_EMAIL_DOMAIN = "demo.invalid";
export const isDemoEmail = (email: string) => email.endsWith(`@${DEMO_EMAIL_DOMAIN}`);

/** Which sign-in methods this deployment can actually offer. */
export const signInMethods = {
  email: Boolean(process.env.AUTH_RESEND_KEY) || devSignInLinks,
  google: Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
};

/**
 * Data Access Layer entry point. Every server query and action that touches
 * user data calls this first; it redirects to /login when there is no session.
 * Reads cookies, so callers must render inside a <Suspense> boundary.
 * Cached per request, so the layout, banner and page share one session lookup.
 */
export const requireUser = cache(async (): Promise<CurrentUser> => {
  // Auth.js generates random values after reading the cookie, which Next rejects during
  // partial prefetching. connection() keeps the session read strictly at request time.
  await connection();
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !user.email) redirect("/login");
  return {
    id: user.id,
    name: user.name ?? null,
    email: user.email,
    image: user.image ?? null,
    isDemo: isDemoEmail(user.email),
  };
});
