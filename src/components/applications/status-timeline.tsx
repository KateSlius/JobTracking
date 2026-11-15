import type { ApplicationDetail } from "@/server/queries/applications";
import { formatDateTime } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/constants";
import { StatusBadge } from "./status-badge";

/** Newest first. The last entry (fromStatus = null) is when the application was added. */
export function StatusTimeline({ changes }: { changes: ApplicationDetail["statusChanges"] }) {
  if (changes.length === 0) {
    return <p className="text-muted-foreground text-sm">No history yet.</p>;
  }
  return (
    <ol className="relative flex flex-col gap-5 border-l pl-5">
      {changes.map((change) => (
        <li key={change.id} className="relative">
          <span
            aria-hidden
            className="bg-background border-foreground/30 absolute top-1.5 -left-[25px] size-2.5 rounded-full border-2"
          />
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <StatusBadge status={change.toStatus} />
            <span className="text-muted-foreground">
              {change.fromStatus ? `from ${STATUS_LABEL[change.fromStatus]}` : "Added to tracker"}
            </span>
          </div>
          <time
            dateTime={change.changedAt.toISOString()}
            className="text-muted-foreground mt-1 block text-xs"
          >
            {formatDateTime(change.changedAt)}
          </time>
          {change.note && <p className="mt-1 text-sm whitespace-pre-line">{change.note}</p>}
        </li>
      ))}
    </ol>
  );
}
