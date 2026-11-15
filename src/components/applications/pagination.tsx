import Link from "next/link";
import { Button } from "@/components/ui/button";
import { filtersToSearchParams, type ApplicationFilters } from "@/lib/validation/filters";

export function Pagination({
  filters,
  pageCount,
  total,
  pageSize,
}: {
  filters: ApplicationFilters;
  pageCount: number;
  total: number;
  pageSize: number;
}) {
  const page = Math.min(filters.page, pageCount);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const href = (p: number) => {
    const qs = filtersToSearchParams({ ...filters, page: p }).toString();
    return qs ? `/applications?${qs}` : "/applications";
  };

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-4 text-sm">
      <p className="text-muted-foreground">
        Showing {from}–{to} of {total}
      </p>
      {pageCount > 1 && (
        <div className="flex gap-2">
          {page > 1 ? (
            <Button variant="outline" size="sm" render={<Link href={href(page - 1)} />}>
              Previous
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
          )}
          {page < pageCount ? (
            <Button variant="outline" size="sm" render={<Link href={href(page + 1)} />}>
              Next
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Next
            </Button>
          )}
        </div>
      )}
    </nav>
  );
}
