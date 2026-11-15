"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatEventTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/server/actions/reminders";
import type { NotificationsData } from "@/server/queries/reminders";

export function NotificationBell({ data }: { data: NotificationsData }) {
  const [, startTransition] = useTransition();
  const label = data.unread ? `Notifications, ${data.unread} unread` : "Notifications, none unread";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={label}
        className="hover:bg-muted focus-visible:ring-ring relative rounded-full p-2 outline-none focus-visible:ring-2"
      >
        <Bell className="size-5" aria-hidden />
        {data.unread > 0 && (
          <span
            aria-hidden
            className="bg-destructive absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-4 font-semibold text-white"
          >
            {data.unread > 9 ? "9+" : data.unread}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        {/* Base UI requires labels inside a group (error #31 otherwise). */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-foreground font-medium">
            Notifications
          </DropdownMenuLabel>
          {data.latest.length === 0 ? (
            <p className="text-muted-foreground px-2 py-6 text-center text-sm">
              No notifications yet.
            </p>
          ) : (
            data.latest.map((n) => {
              const href = n.reminder?.applicationId
                ? `/applications/${n.reminder.applicationId}`
                : "/reminders";
              return (
                <DropdownMenuItem
                  key={n.id}
                  render={<Link href={href} />}
                  onClick={() => {
                    if (!n.readAt) startTransition(() => markNotificationReadAction(n.id));
                  }}
                  className="flex items-start gap-2"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "mt-1.5 size-2 shrink-0 rounded-full",
                      n.readAt ? "bg-transparent" : "bg-[var(--viz-accent)]",
                    )}
                  />
                  <span className="flex min-w-0 flex-col">
                    <span className={cn("text-sm", !n.readAt && "font-medium")}>
                      {!n.readAt && <span className="sr-only">Unread: </span>}
                      {n.message}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {formatEventTime(n.createdAt)}
                    </span>
                  </span>
                </DropdownMenuItem>
              );
            })
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {data.unread > 0 && (
          <DropdownMenuItem onClick={() => startTransition(() => markAllNotificationsReadAction())}>
            Mark all as read
          </DropdownMenuItem>
        )}
        <DropdownMenuItem render={<Link href="/reminders" />}>All reminders</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
