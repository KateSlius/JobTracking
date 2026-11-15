import "server-only";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { db } from "@/lib/db";

// Env vars read automatically by Auth.js:
// AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, AUTH_RESEND_KEY
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "database" },
  providers: [
    Google,
    Resend({ from: process.env.EMAIL_FROM ?? "Job Tracker <onboarding@resend.dev>" }),
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
};

/**
 * Data Access Layer entry point. Every server query and action that touches
 * user data calls this first; it redirects to /login when there is no session.
 * Reads cookies, so callers must render inside a <Suspense> boundary.
 */
export async function requireUser(): Promise<CurrentUser> {
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
  };
}
