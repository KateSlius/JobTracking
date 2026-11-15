"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Briefcase, CalendarDays, LayoutDashboard, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

// Routes beyond /dashboard are built in later phases; see PLAN.md.
const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/applications", label: "Applications", icon: Briefcase },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/reminders", label: "Reminders", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

/** Highlights the current section. Must sit inside <Suspense> (usePathname on dynamic routes). */
export function AppNav() {
  return <NavLinks pathname={usePathname()} />;
}

/** Same links with no highlight, for the Suspense fallback while the path streams in. */
export function NavLinks({ pathname = "" }: { pathname?: string }) {
  return (
    <nav aria-label="Main" className="flex gap-1 md:flex-col">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
              active && "bg-muted text-foreground font-medium",
            )}
          >
            <Icon className="size-4" aria-hidden />
            <span className="sr-only sm:not-sr-only">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
