import { STATUS_LABEL } from "@/lib/constants";
import type { FunnelStage } from "@/lib/metrics";

const STAGE_LABEL: Record<FunnelStage, string> = {
  APPLIED: STATUS_LABEL.APPLIED,
  ASSESSMENT: `${STATUS_LABEL.ASSESSMENT} or further`,
  INTERVIEW: `${STATUS_LABEL.INTERVIEW} or further`,
  OFFER: STATUS_LABEL.OFFER,
};

function percent(part: number, whole: number) {
  return whole ? Math.round((part / whole) * 100) : 0;
}

/**
 * The pipeline as a meter list: each stage's count against everything applied for.
 * Name, bar and figure per row; the figure is always printed, and hover or focus adds
 * the conversion from the previous stage.
 */
export function FunnelMeters({ stages }: { stages: { stage: FunnelStage; count: number }[] }) {
  const applied = stages[0]?.count ?? 0;
  return (
    <ol className="flex flex-col gap-3">
      {stages.map(({ stage, count }, i) => {
        const share = percent(count, applied);
        const previous = i > 0 ? stages[i - 1].count : null;
        const fromPrevious = previous != null ? percent(count, previous) : null;
        const description =
          i === 0
            ? `${count} applications sent`
            : `${count} of ${applied} reached ${STAGE_LABEL[stage].toLowerCase()} (${share}%). ${fromPrevious}% of the previous stage.`;
        return (
          <li
            key={stage}
            tabIndex={0}
            aria-label={description}
            className="group focus-visible:ring-ring relative grid grid-cols-[minmax(0,9rem)_1fr_4.5rem] items-center gap-3 rounded-sm outline-none focus-visible:ring-2"
          >
            <span className="truncate text-sm">{STAGE_LABEL[stage]}</span>
            <span
              className="relative h-2 overflow-hidden rounded-full bg-[var(--viz-track)]"
              aria-hidden
            >
              <span
                className="absolute inset-y-0 left-0 rounded-full bg-[var(--viz-accent)] transition-[filter] group-hover:brightness-110 group-focus-visible:brightness-110"
                style={{ width: `${share}%` }}
              />
            </span>
            <span className="text-right text-sm tabular-nums" aria-hidden>
              <span className="font-medium">{count}</span>
              {i > 0 && <span className="text-muted-foreground"> · {share}%</span>}
            </span>
            {fromPrevious != null && (
              <span
                role="tooltip"
                className="bg-popover text-popover-foreground pointer-events-none absolute -top-9 left-36 z-10 hidden rounded-md border px-2 py-1 text-xs whitespace-nowrap shadow-sm group-hover:block group-focus-visible:block"
              >
                <span className="font-medium">{fromPrevious}%</span>{" "}
                <span className="text-muted-foreground">
                  of {STAGE_LABEL[stages[i - 1].stage].toLowerCase()} went on
                </span>
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
