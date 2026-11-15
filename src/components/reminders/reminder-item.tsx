"use client";

import Link from "next/link";
import { useTransition, type ReactNode } from "react";
import { AlarmClockOff, Check, Clock, RotateCcw, Trash2, X } from "lucide-react";
import type { ReminderKind } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { formatEventTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  completeReminderAction,
  deleteReminderAction,
  dismissReminderAction,
  reopenReminderAction,
  snoozeReminderAction,
} from "@/server/actions/reminders";
import type { ReminderRow } from "@/server/queries/reminders";

export const REMINDER_KIND_LABEL: Record<ReminderKind, string> = {
  CLOSING_DATE: "Closing date",
  FOLLOW_UP: "Follow-up",
  INTERVIEW_PREP: "Interview prep",
  CUSTOM: "Your reminder",
};

export function ReminderItem({
  reminder,
  overdue = false,
  showApplication = true,
}: {
  reminder: ReminderRow;
  overdue?: boolean;
  showApplication?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const run = (action: (id: string) => Promise<void>) => () =>
    startTransition(() => action(reminder.id));
  const done = Boolean(reminder.completedAt);
  const auto = reminder.kind !== "CUSTOM";

  return (
    <li
      className={cn(
        "flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between",
        pending && "opacity-60",
      )}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className={cn("text-sm font-medium", done && "text-muted-foreground line-through")}>
          {reminder.title}
        </p>
        <p className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-xs">
          <span className={cn(overdue && !done && "text-destructive font-medium")}>
            {done ? "Done" : overdue ? "Overdue since" : "Due"}{" "}
            {formatEventTime(done ? reminder.completedAt! : reminder.dueAt)}
          </span>
          <span aria-hidden>·</span>
          <span>{REMINDER_KIND_LABEL[reminder.kind]}</span>
          {showApplication && reminder.application && (
            <>
              <span aria-hidden>·</span>
              <Link
                href={`/applications/${reminder.application.id}`}
                className="hover:text-foreground underline underline-offset-4"
              >
                {reminder.application.company.name}
              </Link>
            </>
          )}
        </p>
      </div>
      <div className="flex shrink-0 gap-1">
        {done ? (
          <Button size="sm" variant="ghost" disabled={pending} onClick={run(reopenReminderAction)}>
            <RotateCcw /> Undo
          </Button>
        ) : (
          <>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={run(completeReminderAction)}
            >
              <Check /> Done
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={run(snoozeReminderAction)}
              title="Remind me again at 09:00 tomorrow"
            >
              <Clock /> Snooze
            </Button>
            {auto ? (
              <Button
                size="icon-sm"
                variant="ghost"
                disabled={pending}
                onClick={run(dismissReminderAction)}
                aria-label={`Dismiss: ${reminder.title}`}
                title="Dismiss"
              >
                <X />
              </Button>
            ) : (
              <Button
                size="icon-sm"
                variant="ghost"
                disabled={pending}
                onClick={run(deleteReminderAction)}
                aria-label={`Delete: ${reminder.title}`}
                title="Delete"
              >
                <Trash2 />
              </Button>
            )}
          </>
        )}
      </div>
    </li>
  );
}

export function NoReminders({ children }: { children: ReactNode }) {
  return (
    <p className="text-muted-foreground flex items-center gap-2 text-sm">
      <AlarmClockOff className="size-4" aria-hidden /> {children}
    </p>
  );
}
