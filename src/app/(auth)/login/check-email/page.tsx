import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Check your email" };

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
      </Card>
    </main>
  );
}
