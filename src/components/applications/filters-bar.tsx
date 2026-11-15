"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { ArrowDownWideNarrow, ArrowUpNarrowWide, Search, X } from "lucide-react";
import type { ApplicationStatus } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { LOCATION_TYPE_LABEL, SOURCE_LABEL, STATUS_LABEL, STATUS_ORDER } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  DEFAULT_DIR,
  SORT_KEYS,
  SORT_LABEL,
  filtersToSearchParams,
  hasActiveFilters,
  parseFilters,
  type ApplicationFilters,
} from "@/lib/validation/filters";

export function FiltersBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const ids = useId();

  const filters = parseFilters(Object.fromEntries(searchParams));
  const [query, setQuery] = useState(filters.q);

  const update = (patch: Partial<ApplicationFilters>) => {
    // Read the live URL rather than the render-time `filters`, so a debounced search
    // that fires after another filter changed doesn't undo that change.
    const current = parseFilters(Object.fromEntries(new URLSearchParams(window.location.search)));
    // Any filter change goes back to page 1.
    const qs = filtersToSearchParams({ ...current, page: 1, ...patch }).toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };

  // Debounce typing into the search box.
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(searchTimer.current), []);
  const onSearchChange = (value: string) => {
    setQuery(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => update({ q: value.trim() }), 300);
  };

  const toggleStatus = (status: ApplicationStatus) => {
    const set = new Set(filters.status);
    if (set.has(status)) set.delete(status);
    else set.add(status);
    update({ status: STATUS_ORDER.filter((s) => set.has(s)) });
  };

  return (
    <div
      className={cn("flex flex-col gap-3 transition-opacity", pending && "opacity-70")}
      aria-busy={pending}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative sm:w-72">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
            aria-hidden
          />
          <label htmlFor={`${ids}-q`} className="sr-only">
            Search applications
          </label>
          <Input
            id={`${ids}-q`}
            type="search"
            value={query}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search company, role or city"
            className="pl-8"
          />
        </div>

        <label htmlFor={`${ids}-source`} className="sr-only">
          Source
        </label>
        <NativeSelect
          id={`${ids}-source`}
          value={filters.source ?? ""}
          onChange={(e) =>
            update({ source: (e.target.value || null) as ApplicationFilters["source"] })
          }
        >
          <NativeSelectOption value="">All sources</NativeSelectOption>
          {Object.entries(SOURCE_LABEL).map(([value, label]) => (
            <NativeSelectOption key={value} value={value}>
              {label}
            </NativeSelectOption>
          ))}
        </NativeSelect>

        <label htmlFor={`${ids}-location`} className="sr-only">
          Work pattern
        </label>
        <NativeSelect
          id={`${ids}-location`}
          value={filters.location ?? ""}
          onChange={(e) =>
            update({ location: (e.target.value || null) as ApplicationFilters["location"] })
          }
        >
          <NativeSelectOption value="">Any work pattern</NativeSelectOption>
          {Object.entries(LOCATION_TYPE_LABEL).map(([value, label]) => (
            <NativeSelectOption key={value} value={value}>
              {label}
            </NativeSelectOption>
          ))}
        </NativeSelect>

        <div className="flex items-center gap-1 sm:ml-auto">
          <label htmlFor={`${ids}-sort`} className="text-muted-foreground text-sm">
            Sort by
          </label>
          <NativeSelect
            id={`${ids}-sort`}
            value={filters.sort}
            onChange={(e) => {
              const sort = e.target.value as ApplicationFilters["sort"];
              update({ sort, dir: DEFAULT_DIR[sort] });
            }}
          >
            {SORT_KEYS.map((key) => (
              <NativeSelectOption key={key} value={key}>
                {SORT_LABEL[key]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => update({ dir: filters.dir === "asc" ? "desc" : "asc" })}
            aria-label={
              filters.dir === "asc"
                ? "Sorted ascending. Switch to descending"
                : "Sorted descending. Switch to ascending"
            }
          >
            {filters.dir === "asc" ? <ArrowUpNarrowWide /> : <ArrowDownWideNarrow />}
          </Button>
        </div>
      </div>

      <div
        className="flex flex-wrap items-center gap-1.5"
        role="group"
        aria-label="Filter by status"
      >
        {STATUS_ORDER.map((status) => {
          const active = filters.status.includes(status);
          return (
            <button
              key={status}
              type="button"
              aria-pressed={active}
              onClick={() => toggleStatus(status)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition-colors",
                active
                  ? "bg-foreground text-background border-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {STATUS_LABEL[status]}
            </button>
          );
        })}
        {hasActiveFilters(filters) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              clearTimeout(searchTimer.current);
              setQuery("");
              update({ q: "", status: [], source: null, location: null });
            }}
          >
            <X /> Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
