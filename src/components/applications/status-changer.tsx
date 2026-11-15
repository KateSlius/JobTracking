"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { toast } from "sonner";
import type { ApplicationStatus } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { STATUS_LABEL, STATUS_ORDER } from "@/lib/constants";
import type { StatusActionState } from "@/server/actions/applications";

export function StatusChanger({
  current,
  action,
}: {
  current: ApplicationStatus;
  action: (state: StatusActionState, formData: FormData) => Promise<StatusActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) toast.success("Status updated");
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-status`}>Move to</Label>
        {/* key resets the select to the new current status after a successful change */}
        <NativeSelect
          key={current}
          id={`${id}-status`}
          name="status"
          defaultValue={current}
          className="w-full"
        >
          {STATUS_ORDER.map((s) => (
            <NativeSelectOption key={s} value={s}>
              {STATUS_LABEL[s]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-note`}>Note (optional)</Label>
        <Textarea
          key={`note-${current}`}
          id={`${id}-note`}
          name="note"
          rows={2}
          placeholder="e.g. Recruiter called, 2nd round next week"
        />
      </div>
      {state.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Updating…" : "Update status"}
      </Button>
    </form>
  );
}
