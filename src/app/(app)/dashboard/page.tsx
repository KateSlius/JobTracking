import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { formatDateLong } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };

// Placeholder until Phase 2 adds stats, the funnel chart and upcoming interviews.
async function Greeting() {
  const user = await requireUser();
  const firstName = user.name?.split(" ")[0];
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-2xl font-semibold tracking-tight">
        {firstName ? `Hello, ${firstName}` : "Hello"}
      </h1>
      <p className="text-muted-foreground text-sm">{formatDateLong(new Date())}</p>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="bg-muted h-14 w-48 animate-pulse rounded-md" />}>
      <Greeting />
    </Suspense>
  );
}
