"use client";

import Link from "next/link";
import {
  useOptimistic,
  useState,
  useTransition,
  type KeyboardEventHandler,
  type ReactNode,
} from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
} from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import { toast } from "sonner";
import type { ApplicationStatus } from "@/generated/prisma/enums";
import { STATUS_LABEL, STATUS_ORDER } from "@/lib/constants";
import { formatCalendarDate, formatSalary, londonToday } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { StatusActionState } from "@/server/actions/applications";
import type { ApplicationListRow } from "@/server/queries/applications";
import { StatusBadge } from "./status-badge";

type Move = { id: string; status: ApplicationStatus };
type MoveAction = (id: string, toStatus: string) => Promise<StatusActionState>;

const label = (row: ApplicationListRow) => `${row.roleTitle} at ${row.company.name}`;

/** Mouse uses the pointer; keyboard falls back to rectangle overlap with the moved card. */
const collisionDetection: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length ? hits : rectIntersection(args);
};

/** Left/right arrows jump a whole column instead of nudging the card 25px. */
const columnKeyboardCoordinates: KeyboardCoordinateGetter = (
  event,
  { context: { active, over, collisionRect, droppableRects } },
) => {
  if (!collisionRect || (event.code !== "ArrowRight" && event.code !== "ArrowLeft")) return;
  const columns = STATUS_ORDER.flatMap((status) => {
    const rect = droppableRects.get(status);
    return rect ? [{ status, rect }] : [];
  });
  const currentStatus = over?.id ?? active?.data.current?.status;
  const index = columns.findIndex((c) => c.status === currentStatus);
  const target = columns[index + (event.code === "ArrowRight" ? 1 : -1)];
  if (!target) return;
  return {
    x: target.rect.left + target.rect.width / 2 - collisionRect.width / 2,
    y: target.rect.top + 48,
  };
};

export function KanbanBoard({
  rows,
  moveAction,
}: {
  rows: ApplicationListRow[];
  moveAction: MoveAction;
}) {
  const [optimisticRows, applyMove] = useOptimistic(rows, (state, move: Move) => {
    const moved = state.find((r) => r.id === move.id);
    if (!moved) return state;
    // Moved card goes to the top of its new column, matching the server's "recently updated" order.
    return [{ ...moved, status: move.status }, ...state.filter((r) => r.id !== move.id)];
  });
  const [, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // Press-and-hold on touch so swiping still scrolls the board.
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: columnKeyboardCoordinates }),
  );

  const byId = new Map(optimisticRows.map((r) => [r.id, r]));
  const activeRow = activeId ? byId.get(activeId) : undefined;

  const announcements: Announcements = {
    onDragStart: ({ active }) => {
      const row = byId.get(String(active.id));
      return row ? `Picked up ${label(row)}, in ${STATUS_LABEL[row.status]}.` : "";
    },
    onDragOver: ({ active, over }) => {
      const row = byId.get(String(active.id));
      if (!row) return "";
      return over
        ? `${label(row)} is over ${STATUS_LABEL[over.id as ApplicationStatus]}.`
        : `${label(row)} is not over a column.`;
    },
    onDragEnd: ({ active, over }) => {
      const row = byId.get(String(active.id));
      if (!row) return "";
      return over && over.id !== row.status
        ? `${label(row)} moved to ${STATUS_LABEL[over.id as ApplicationStatus]}.`
        : `${label(row)} dropped. Status unchanged.`;
    },
    onDragCancel: ({ active }) => {
      const row = byId.get(String(active.id));
      return row ? `Move cancelled. ${label(row)} is still in ${STATUS_LABEL[row.status]}.` : "";
    },
  };

  const onDragStart = ({ active }: DragStartEvent) => setActiveId(String(active.id));

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    const row = byId.get(String(active.id));
    const toStatus = over?.id as ApplicationStatus | undefined;
    if (!row || !toStatus || row.status === toStatus) return;

    startTransition(async () => {
      applyMove({ id: row.id, status: toStatus });
      const result = await moveAction(row.id, toStatus);
      // On error the optimistic move is dropped when the transition ends, so the card snaps back.
      if (result.error) toast.error(result.error);
    });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable:
            "To move this application, press space or enter. Use the left and right arrow keys to choose a column, then press space or enter to drop it, or escape to cancel.",
        },
      }}
    >
      {/* The board scrolls sideways on its own so the page never does. `relative` matters:
          without it, absolutely positioned children (sr-only labels) escape the clipping
          and widen the page. */}
      <div className="relative -mx-4 overflow-x-auto px-4 pb-4 md:mx-0 md:px-0">
        <div className="flex w-max gap-3">
          {STATUS_ORDER.map((status) => (
            <Column
              key={status}
              status={status}
              rows={optimisticRows.filter((r) => r.status === status)}
              activeId={activeId}
            />
          ))}
        </div>
      </div>
      <DragOverlay dropAnimation={null}>
        {activeRow ? <CardBody row={activeRow} className="ring-ring shadow-lg ring-2" /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function Column({
  status,
  rows,
  activeId,
}: {
  status: ApplicationStatus;
  rows: ApplicationListRow[];
  activeId: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const headingId = `kanban-${status}`;
  return (
    <section
      ref={setNodeRef}
      aria-labelledby={headingId}
      className={cn(
        "bg-muted/50 flex w-64 shrink-0 flex-col gap-2 rounded-lg p-2 transition-colors",
        isOver && "bg-muted ring-ring ring-2",
      )}
    >
      <h2 id={headingId} className="flex items-center justify-between px-1 py-1">
        <StatusBadge status={status} />
        <span className="text-muted-foreground text-xs tabular-nums">
          {rows.length}
          <span className="sr-only"> applications</span>
        </span>
      </h2>
      <ul className="flex min-h-24 flex-col gap-2">
        {rows.map((row) => (
          <DraggableCard key={row.id} row={row} hidden={row.id === activeId} />
        ))}
        {rows.length === 0 && (
          <li className="text-muted-foreground rounded-md border border-dashed px-3 py-6 text-center text-xs">
            Drop here
          </li>
        )}
      </ul>
    </section>
  );
}

function DraggableCard({ row, hidden }: { row: ApplicationListRow; hidden: boolean }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef } = useDraggable({
    id: row.id,
    data: { status: row.status },
  });
  // Mouse and touch drag from anywhere on the card; the keyboard drags from the grip button so
  // Enter on the title link still opens the application.
  const { onKeyDown, ...pointerListeners } = listeners ?? {};
  const onHandleKeyDown = onKeyDown as KeyboardEventHandler<HTMLButtonElement> | undefined;
  return (
    <li
      ref={setNodeRef}
      {...pointerListeners}
      className={cn("touch-manipulation", hidden && "opacity-30")}
    >
      <CardBody
        row={row}
        handle={
          <button
            ref={setActivatorNodeRef}
            type="button"
            {...attributes}
            onKeyDown={onHandleKeyDown}
            aria-label={`Move ${label(row)}`}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring -m-1 shrink-0 cursor-grab rounded p-1 outline-none focus-visible:ring-2"
          >
            <GripVertical className="size-4" aria-hidden />
          </button>
        }
      />
    </li>
  );
}

function CardBody({
  row,
  handle,
  className,
}: {
  row: ApplicationListRow;
  handle?: ReactNode;
  className?: string;
}) {
  const salary = formatSalary(row.salaryMinPence, row.salaryMaxPence, row.salaryPeriod);
  return (
    <article
      className={cn(
        "bg-card flex cursor-grab gap-2 rounded-md border p-3 text-sm select-none active:cursor-grabbing",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Link
          href={`/applications/${row.id}`}
          className="line-clamp-2 font-medium hover:underline"
          draggable={false}
        >
          {row.roleTitle}
        </Link>
        <p className="text-muted-foreground truncate text-xs">{row.company.name}</p>
        {(salary || row.closingDate) && (
          <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
            {salary && <span>{salary}</span>}
            {row.closingDate && <ClosingHint date={row.closingDate} />}
          </div>
        )}
      </div>
      {handle}
    </article>
  );
}

function ClosingHint({ date }: { date: Date }) {
  const days = Math.round((date.getTime() - londonToday().getTime()) / 86_400_000);
  return (
    <span
      className={cn(
        days < 0 && "line-through",
        days >= 0 && days <= 3 && "font-medium text-amber-700 dark:text-amber-400",
      )}
    >
      {days < 0 ? "Closed" : "Closes"} {formatCalendarDate(date)}
    </span>
  );
}
