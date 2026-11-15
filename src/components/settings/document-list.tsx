"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteDocumentVersionAction } from "@/server/actions/account";

type Doc = { id: string; kind: "CV" | "COVER_LETTER"; label: string; uses: number };

export function DocumentList({ documents }: { documents: Doc[] }) {
  const [pending, startTransition] = useTransition();
  if (!documents.length) {
    return (
      <p className="text-muted-foreground text-sm">
        None yet. Add a CV or cover letter version when you add or edit an application.
      </p>
    );
  }
  return (
    <ul className={`flex flex-col divide-y ${pending ? "opacity-60" : ""}`}>
      {documents.map((d) => (
        <li
          key={d.id}
          className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
        >
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium">{d.label}</span>
            <span className="text-muted-foreground text-xs">
              {d.kind === "CV" ? "CV" : "Cover letter"} · used by {d.uses}{" "}
              {d.uses === 1 ? "application" : "applications"}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Delete ${d.label}`}
            onClick={() => {
              const note = d.uses
                ? ` ${d.uses} ${d.uses === 1 ? "application" : "applications"} will no longer show it.`
                : "";
              if (window.confirm(`Delete "${d.label}"?${note}`)) {
                startTransition(() => deleteDocumentVersionAction(d.id));
              }
            }}
          >
            <Trash2 />
          </Button>
        </li>
      ))}
    </ul>
  );
}
