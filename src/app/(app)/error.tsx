"use client";

import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";

// Error boundaries must be Client Components. In production, server error messages are replaced
// with a generic one; the digest matches the server logs.
export default function AppError({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = error instanceof Error && "digest" in error ? String(error.digest) : null;
  return (
    <div role="alert" className="flex max-w-md flex-col items-start gap-3 py-12">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="text-muted-foreground text-sm">
        Your data is safe. Try again, and if it keeps happening, let us know
        {digest ? (
          <>
            {" "}
            and quote <span className="font-mono">{digest}</span>
          </>
        ) : null}
        .
      </p>
      <div className="flex gap-2">
        <Button onClick={() => retry()}>Try again</Button>
        <LinkButton variant="outline" href="/dashboard">
          Go to dashboard
        </LinkButton>
      </div>
    </div>
  );
}
