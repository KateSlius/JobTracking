"use client";

import { useActionState, useEffect, useId, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { useSubmitWithoutReset } from "@/lib/use-submit-without-reset";
import type { ReminderField } from "@/lib/validation/reminder";
import { createReminderAction, type ReminderFormState } from "@/server/actions/reminders";

/**
 * Add a custom reminder. Pass `applicationId` to attach it to one application, or
 * `applications` to offer a picker (the /reminders page).
 */
export function ReminderForm({
  applicationId,
  applications,
}: {
  applicationId?: string;
  applications?: { id: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <Button variant="outline" className="w-fit" onClick={() => setOpen(true)}>
        <Plus /> Add reminder
      </Button>
    );
  }
  return (
    <OpenForm
      applicationId={applicationId}
      applications={applications}
      onDone={() => setOpen(false)}
    />
  );
}

function OpenForm({
  applicationId,
  applications,
  onDone,
}: {
  applicationId?: string;
  applications?: { id: string; label: string }[];
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState<ReminderFormState, FormData>(
    createReminderAction,
    {},
  );
  const onSubmit = useSubmitWithoutReset(formAction);
  const ids = useId();
  const values = state.values ?? {};
  const errors = state.errors ?? {};

  useEffect(() => {
    if (state.savedAt) onDone();
  }, [state.savedAt, onDone]);

  const field = (name: ReminderField) => ({
    id: `${ids}-${name}`,
    name,
    defaultValue: values[name] ?? "",
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `${ids}-${name}-error` : undefined,
  });
  const error = (name: ReminderField, hint?: string) =>
    errors[name] ? (
      <p id={`${ids}-${name}-error`} className="text-destructive text-xs">
        {errors[name]}
      </p>
    ) : hint ? (
      <p className="text-muted-foreground text-xs">{hint}</p>
    ) : null;

  return (
    <form
      action={formAction}
      onSubmit={onSubmit}
      noValidate
      className="bg-muted/40 flex flex-col gap-3 rounded-lg border p-4"
    >
      {state.message && (
        <p role="alert" className="text-destructive text-sm">
          {state.message}
        </p>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${ids}-title`}>Remind me to…</Label>
        <Input {...field("title")} placeholder="e.g. Chase the recruiter" autoFocus />
        {error("title")}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${ids}-date`}>Date</Label>
          <Input {...field("date")} inputMode="numeric" placeholder="DD/MM/YYYY" />
          {error("date", "DD/MM/YYYY")}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${ids}-time`}>Time</Label>
          <Input {...field("time")} placeholder="09:00" />
          {error("time", "UK time")}
        </div>
      </div>
      {applicationId ? (
        <input type="hidden" name="applicationId" value={applicationId} />
      ) : applications ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${ids}-applicationId`}>Application (optional)</Label>
          <NativeSelect {...field("applicationId")} className="w-full sm:max-w-md">
            <NativeSelectOption value="">None</NativeSelectOption>
            {applications.map((a) => (
              <NativeSelectOption key={a.id} value={a.id}>
                {a.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Add reminder"}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
