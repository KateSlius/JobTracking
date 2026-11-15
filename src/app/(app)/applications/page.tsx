import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApplicationsTable } from "@/components/applications/applications-table";
import { FiltersBar } from "@/components/applications/filters-bar";
import { Pagination } from "@/components/applications/pagination";
import { hasActiveFilters, PAGE_SIZE, parseFilters } from "@/lib/validation/filters";
import { listApplications } from "@/server/queries/applications";

export const metadata: Metadata = { title: "My applications" };

async function Results({
  searchParams,
}: {
  searchParams: PageProps<"/applications">["searchParams"];
}) {
  const filters = parseFilters(await searchParams);
  const { rows, total, pageCount } = await listApplications(filters);

  if (total === 0) {
    return hasActiveFilters(filters) ? (
      <p className="text-muted-foreground py-12 text-center text-sm">
        No applications match these filters.
      </p>
    ) : (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
        <p className="font-medium">No applications yet</p>
        <p className="text-muted-foreground max-w-sm text-sm">
          Add a job you&apos;ve applied for, or one you want to save for later.
        </p>
        <Button render={<Link href="/applications/new" />}>
          <Plus /> Add your first application
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border">
        <ApplicationsTable rows={rows} />
      </div>
      <Pagination filters={filters} pageCount={pageCount} total={total} pageSize={PAGE_SIZE} />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-label="Loading applications">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="bg-muted h-12 animate-pulse rounded-md" />
      ))}
    </div>
  );
}

export default function ApplicationsPage({ searchParams }: PageProps<"/applications">) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">My applications</h1>
        <Button render={<Link href="/applications/new" />}>
          <Plus /> Add application
        </Button>
      </div>
      <Suspense fallback={<div className="h-20" />}>
        <FiltersBar />
      </Suspense>
      <Suspense fallback={<TableSkeleton />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
