"use client";

import { useOptimistic, useTransition } from "react";
import { setEmailRemindersAction } from "@/server/actions/reminders";
import { cn } from "@/lib/utils";

/** An accessible switch for "email me my reminders". */
export function EmailToggle({ enabled, demo = false }: { enabled: boolean; demo?: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic(enabled);
  const [, startTransition] = useTransition();
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={optimistic}
        aria-labelledby="email-toggle-label"
        disabled={demo}
        onClick={() =>
          startTransition(async () => {
            setOptimistic(!optimistic);
            await setEmailRemindersAction(!optimistic);
          })
        }
        className={cn(
          "focus-visible:ring-ring relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50",
          optimistic ? "bg-primary" : "bg-input",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "bg-background inline-block size-5 rounded-full shadow transition-transform",
            optimistic ? "translate-x-[18px]" : "translate-x-0.5",
          )}
        />
      </button>
      <span id="email-toggle-label" className="text-sm">
        Email me when reminders are due
        <span className="text-muted-foreground block text-xs">
          {demo
            ? "Not available on demo accounts: they have no real email address."
            : "One email per day at most, listing everything due."}
        </span>
      </span>
    </div>
  );
}
