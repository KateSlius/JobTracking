"use client";

import { useActionState } from "react";
import { PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startDemoAction, type DemoState } from "@/server/actions/demo";

/** One click to a private, pre-filled demo account. */
export function DemoButton({
  variant = "outline",
  size = "lg",
  className,
}: {
  variant?: "default" | "outline";
  size?: "default" | "lg";
  className?: string;
}) {
  const [state, formAction, pending] = useActionState<DemoState>(startDemoAction, {});
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <Button type="submit" variant={variant} size={size} disabled={pending} className={className}>
        <PlayCircle /> {pending ? "Setting up your demo…" : "Try the demo"}
      </Button>
      {state.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
    </form>
  );
}
