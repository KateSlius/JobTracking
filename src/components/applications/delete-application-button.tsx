"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";

export function DeleteApplicationButton({
  action,
  label,
}: {
  action: () => Promise<void>;
  label: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="destructive"
      disabled={pending}
      onClick={() => {
        if (
          !window.confirm(`Delete "${label}"? This removes its history too and can't be undone.`)
        ) {
          return;
        }
        startTransition(() => action());
      }}
    >
      {pending ? "Deleting…" : "Delete"}
    </Button>
  );
}
