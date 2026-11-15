"use client";

import { useActionState, useEffect, useId, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { INTERVIEW_TYPE_LABEL } from "@/lib/constants";
import { useSubmitWithoutReset } from "@/lib/use-submit-without-reset";
import type { InterviewField, InterviewFormValues } from "@/lib/validation/interview";
import type { InterviewFormState } from "@/server/actions/interviews";

type Props = {
  action: (state: InterviewFormState, formData: FormData) => Promise<InterviewFormState>;
  initialValues?: InterviewFormValues;
  submitLabel: string;
  onDone: () => void;
};

export function InterviewForm({ action, initialValues = {}, submitLabel, onDone }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const onSubmit = useSubmitWithoutReset(formAction);
  const values = state.values ?? initialValues;
  const errors = state.errors ?? {};
  const [type, setType] = useState(values.type || "VIDEO");
  const ids = useId();

  useEffect(() => {
    if (state.savedAt) onDone();
  }, [state.savedAt, onDone]);

  const field = (name: InterviewField) => ({
    id: `${ids}-${name}`,
    name,
    defaultValue: values[name] ?? "",
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `${ids}-${name}-error` : undefined,
  });

  const inPerson = type === "IN_PERSON" || type === "ASSESSMENT_CENTRE";

  return (
    <form
      action={formAction}
      onSubmit={onSubmit}
      noValidate
      className="bg-muted/40 flex flex-col gap-4 rounded-lg border p-4"
    >
      {state.message && (
        <p role="alert" className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
          {state.message}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Type" name="type" ids={ids} error={errors.type}>
          <NativeSelect
            {...field("type")}
            defaultValue={undefined}
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full"
          >
            {Object.entries(INTERVIEW_TYPE_LABEL).map(([value, label]) => (
              <NativeSelectOption key={value} value={value}>
                {label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Stage" name="stage" ids={ids} error={errors.stage}>
          <Input {...field("stage")} placeholder="e.g. 1st round, technical" />
        </Field>
        <Field label="Date" name="date" ids={ids} error={errors.date} hint="DD/MM/YYYY">
          <Input {...field("date")} inputMode="numeric" placeholder="DD/MM/YYYY" required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start" name="startTime" ids={ids} error={errors.startTime} hint="UK time">
            <Input {...field("startTime")} placeholder="14:30" required />
          </Field>
          <Field label="End" name="endTime" ids={ids} error={errors.endTime} hint="Optional">
            <Input {...field("endTime")} placeholder="15:30" />
          </Field>
        </div>
        {inPerson ? (
          <div className="sm:col-span-2">
            <Field label="Address" name="location" ids={ids} error={errors.location}>
              <Input
                {...field("location")}
                autoComplete="off"
                placeholder="Building, street, city"
              />
            </Field>
          </div>
        ) : type === "VIDEO" ? (
          <div className="sm:col-span-2">
            <Field label="Meeting link" name="meetingUrl" ids={ids} error={errors.meetingUrl}>
              <Input
                {...field("meetingUrl")}
                type="url"
                inputMode="url"
                placeholder="Teams, Zoom or Google Meet link"
              />
            </Field>
          </div>
        ) : null}
        <div className="sm:col-span-2">
          <Field label="Interviewers" name="interviewers" ids={ids} error={errors.interviewers}>
            <Input {...field("interviewers")} placeholder="Names and roles" />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field
            label="Prep notes"
            name="prepNotes"
            ids={ids}
            error={errors.prepNotes}
            hint="Private: not included in calendar invites"
          >
            <Textarea {...field("prepNotes")} rows={3} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="How it went" name="outcome" ids={ids} error={errors.outcome}>
            <Textarea {...field("outcome")} rows={2} />
          </Field>
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  ids,
  error,
  hint,
  children,
}: {
  label: string;
  name: InterviewField;
  ids: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`${ids}-${name}`}>{label}</Label>
      {children}
      {error ? (
        <p id={`${ids}-${name}-error`} className="text-destructive text-xs">
          {error}
        </p>
      ) : hint ? (
        <p className="text-muted-foreground text-xs">{hint}</p>
      ) : null}
    </div>
  );
}
