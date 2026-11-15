import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LOCATION_TYPE_LABEL } from "@/lib/constants";
import { formatCalendarDate, formatDate, formatSalary, londonToday } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ApplicationListRow } from "@/server/queries/applications";
import { StatusBadge } from "./status-badge";

function location(row: ApplicationListRow) {
  const type = row.locationType ? LOCATION_TYPE_LABEL[row.locationType] : null;
  if (row.locationType === "REMOTE") return type;
  return [row.city, type].filter(Boolean).join(" · ") || "—";
}

/** Closing dates within 3 days are highlighted; past ones are struck through. */
function ClosingDate({ date }: { date: Date | null }) {
  if (!date) return <span className="text-muted-foreground">—</span>;
  const today = londonToday().getTime();
  const days = Math.round((date.getTime() - today) / 86_400_000);
  return (
    <span
      className={cn(
        days < 0 && "text-muted-foreground line-through",
        days >= 0 && days <= 3 && "font-medium text-amber-700 dark:text-amber-400",
      )}
      title={
        days < 0
          ? "Closed"
          : days === 0
            ? "Closes today"
            : `Closes in ${days} day${days === 1 ? "" : "s"}`
      }
    >
      {formatCalendarDate(date)}
    </span>
  );
}

export function ApplicationsTable({ rows }: { rows: ApplicationListRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="hidden md:table-cell">Location</TableHead>
          <TableHead className="hidden lg:table-cell">Salary</TableHead>
          <TableHead>Closing</TableHead>
          <TableHead className="hidden sm:table-cell">Applied</TableHead>
          <TableHead className="hidden xl:table-cell">Updated</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id} className="relative">
            <TableCell className="max-w-64">
              {/* The link's ::after covers the whole row so any cell is clickable. */}
              <Link
                href={`/applications/${row.id}`}
                className="block truncate font-medium after:absolute after:inset-0 hover:underline"
              >
                {row.roleTitle}
              </Link>
              <span className="text-muted-foreground block truncate text-xs">
                {row.company.name}
              </span>
            </TableCell>
            <TableCell>
              <StatusBadge status={row.status} />
            </TableCell>
            <TableCell className="hidden md:table-cell">{location(row)}</TableCell>
            <TableCell className="hidden lg:table-cell">
              {formatSalary(row.salaryMinPence, row.salaryMaxPence, row.salaryPeriod) ?? (
                <span className="text-muted-foreground">—</span>
              )}
            </TableCell>
            <TableCell>
              <ClosingDate date={row.closingDate} />
            </TableCell>
            <TableCell className="hidden sm:table-cell">
              {row.appliedOn ? (
                formatCalendarDate(row.appliedOn)
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </TableCell>
            <TableCell className="text-muted-foreground hidden xl:table-cell">
              {formatDate(row.updatedAt)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
