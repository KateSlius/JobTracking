"use client";

import Link from "next/link";
import { useActionState, useId, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import {
  CONTRACT_TYPE_LABEL,
  IR35_LABEL,
  LOCATION_TYPE_LABEL,
  SALARY_PERIOD_LABEL,
  SOURCE_LABEL,
  STATUS_LABEL,
  STATUS_ORDER,
  UK_CITIES,
} from "@/lib/constants";
import { useSubmitWithoutReset } from "@/lib/use-submit-without-reset";
import type { ApplicationField, ApplicationFormValues } from "@/lib/validation/application";
import type { ApplicationFormState } from "@/server/actions/applications";
import type { FormSuggestions } from "@/server/queries/applications";

type Props = {
  mode: "create" | "edit";
  action: (state: ApplicationFormState, formData: FormData) => Promise<ApplicationFormState>;
  initialValues?: ApplicationFormValues;
  suggestions: FormSuggestions;
  cancelHref: string;
};

export function ApplicationForm({
  mode,
  action,
  initialValues = {},
  suggestions,
  cancelHref,
}: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const onSubmit = useSubmitWithoutReset(formAction);
  // After a failed submit, show what the person typed, not the original values.
  const values = state.values ?? initialValues;
  const errors = state.errors ?? {};

  // These drive which fields are shown, so they are controlled.
  const [source, setSource] = useState(values.source ?? "");
  const [locationType, setLocationType] = useState(values.locationType ?? "");
  const [contractType, setContractType] = useState(values.contractType ?? "");

  const ids = useId();
  const listId = (name: string) => `${ids}-${name}-list`;

  const field = (name: ApplicationField) => ({
    id: `${ids}-${name}`,
    name,
    defaultValue: values[name] ?? "",
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `${ids}-${name}-error` : undefined,
  });

  return (
    <form
      action={formAction}
      onSubmit={onSubmit}
      className="flex max-w-3xl flex-col gap-8"
      noValidate
    >
      {state.message && (
        <p role="alert" className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
          {state.message}
        </p>
      )}

      <Section title="The role">
        <Field label="Company" name="companyName" ids={ids} error={errors.companyName} required>
          <Input {...field("companyName")} list={listId("companies")} autoComplete="off" required />
          <datalist id={listId("companies")}>
            {suggestions.companies.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
        <Field label="Job title" name="roleTitle" ids={ids} error={errors.roleTitle} required>
          <Input {...field("roleTitle")} required />
        </Field>
        {mode === "create" && (
          <Field label="Status" name="status" ids={ids} error={errors.status}>
            <NativeSelect
              {...field("status")}
              defaultValue={values.status || "SAVED"}
              className="w-full"
            >
              {STATUS_ORDER.map((s) => (
                <NativeSelectOption key={s} value={s}>
                  {STATUS_LABEL[s]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        )}
        <Field label="Job advert link" name="jobUrl" ids={ids} error={errors.jobUrl}>
          <Input {...field("jobUrl")} type="url" inputMode="url" placeholder="https://" />
        </Field>
        <Field label="Where you found it" name="source" ids={ids} error={errors.source}>
          <NativeSelect
            {...field("source")}
            defaultValue={undefined}
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="w-full"
          >
            <NativeSelectOption value="">Not specified</NativeSelectOption>
            {Object.entries(SOURCE_LABEL).map(([value, label]) => (
              <NativeSelectOption key={value} value={value}>
                {label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        {source === "OTHER" && (
          <Field label="Other source" name="sourceOther" ids={ids} error={errors.sourceOther}>
            <Input {...field("sourceOther")} placeholder="e.g. Otta, a meetup" />
          </Field>
        )}
      </Section>

      <Section title="Location and pay">
        <Field label="Work pattern" name="locationType" ids={ids} error={errors.locationType}>
          <NativeSelect
            {...field("locationType")}
            defaultValue={undefined}
            value={locationType}
            onChange={(e) => setLocationType(e.target.value)}
            className="w-full"
          >
            <NativeSelectOption value="">Not specified</NativeSelectOption>
            {Object.entries(LOCATION_TYPE_LABEL).map(([value, label]) => (
              <NativeSelectOption key={value} value={value}>
                {label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        {locationType !== "REMOTE" && (
          <Field label="City or town" name="city" ids={ids} error={errors.city}>
            <Input {...field("city")} list={listId("cities")} autoComplete="off" />
            <datalist id={listId("cities")}>
              {UK_CITIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
        )}
        <div className="grid gap-4 sm:col-span-2 sm:grid-cols-3">
          <Field
            label="Salary from"
            name="salaryMin"
            ids={ids}
            error={errors.salaryMin}
            hint="e.g. 45000, £45k or £500/day"
          >
            <Input {...field("salaryMin")} inputMode="decimal" />
          </Field>
          <Field label="Salary to" name="salaryMax" ids={ids} error={errors.salaryMax}>
            <Input {...field("salaryMax")} inputMode="decimal" />
          </Field>
          <Field label="Paid" name="salaryPeriod" ids={ids} error={errors.salaryPeriod}>
            <NativeSelect
              {...field("salaryPeriod")}
              defaultValue={values.salaryPeriod || "ANNUM"}
              className="w-full"
            >
              {Object.entries(SALARY_PERIOD_LABEL).map(([value, label]) => (
                <NativeSelectOption key={value} value={value}>
                  {label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        </div>
        <Field label="Contract type" name="contractType" ids={ids} error={errors.contractType}>
          <NativeSelect
            {...field("contractType")}
            defaultValue={undefined}
            value={contractType}
            onChange={(e) => setContractType(e.target.value)}
            className="w-full"
          >
            <NativeSelectOption value="">Not specified</NativeSelectOption>
            {Object.entries(CONTRACT_TYPE_LABEL).map(([value, label]) => (
              <NativeSelectOption key={value} value={value}>
                {label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        {contractType === "CONTRACT" && (
          <Field label="IR35 status" name="ir35Status" ids={ids} error={errors.ir35Status}>
            <NativeSelect {...field("ir35Status")} className="w-full">
              <NativeSelectOption value="">Not specified</NativeSelectOption>
              {Object.entries(IR35_LABEL).map(([value, label]) => (
                <NativeSelectOption key={value} value={value}>
                  {label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        )}
        <div className="flex items-center gap-2 sm:col-span-2">
          <input
            id={`${ids}-visaSponsorshipRequired`}
            name="visaSponsorshipRequired"
            type="checkbox"
            defaultChecked={values.visaSponsorshipRequired === "on"}
            className="accent-primary size-4"
          />
          <Label htmlFor={`${ids}-visaSponsorshipRequired`} className="font-normal">
            I need visa sponsorship for this role
          </Label>
        </div>
      </Section>

      <Section title="Dates">
        <Field
          label="Closing date"
          name="closingDate"
          ids={ids}
          error={errors.closingDate}
          hint="DD/MM/YYYY"
        >
          <Input {...field("closingDate")} inputMode="numeric" placeholder="DD/MM/YYYY" />
        </Field>
        <Field
          label="Date applied"
          name="appliedOn"
          ids={ids}
          error={errors.appliedOn}
          hint={mode === "create" ? "Leave blank to use today once you've applied" : "DD/MM/YYYY"}
        >
          <Input {...field("appliedOn")} inputMode="numeric" placeholder="DD/MM/YYYY" />
        </Field>
      </Section>

      <Section title="Recruiter or contact">
        <Field label="Name" name="contactName" ids={ids} error={errors.contactName}>
          <Input {...field("contactName")} autoComplete="off" />
        </Field>
        <Field label="Agency" name="agencyName" ids={ids} error={errors.agencyName}>
          <Input {...field("agencyName")} placeholder="Leave blank if in-house" />
        </Field>
        <Field label="Email" name="contactEmail" ids={ids} error={errors.contactEmail}>
          <Input {...field("contactEmail")} type="email" autoComplete="off" />
        </Field>
        <Field label="Phone" name="contactPhone" ids={ids} error={errors.contactPhone}>
          <Input {...field("contactPhone")} type="tel" autoComplete="off" />
        </Field>
      </Section>

      <Section title="Documents and notes">
        <Field label="CV version" name="cvVersion" ids={ids} error={errors.cvVersion}>
          <Input {...field("cvVersion")} list={listId("cv")} placeholder="e.g. CV v3 – Product" />
          <datalist id={listId("cv")}>
            {suggestions.cvVersions.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </Field>
        <Field
          label="Cover letter version"
          name="coverLetterVersion"
          ids={ids}
          error={errors.coverLetterVersion}
        >
          <Input {...field("coverLetterVersion")} list={listId("cover")} />
          <datalist id={listId("cover")}>
            {suggestions.coverLetterVersions.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Notes" name="notes" ids={ids} error={errors.notes}>
            <Textarea {...field("notes")} rows={5} />
          </Field>
        </div>
      </Section>

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : mode === "create" ? "Add application" : "Save changes"}
        </Button>
        <Button variant="outline" render={<Link href={cancelHref} />}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="mb-4 text-base font-semibold">{title}</legend>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function Field({
  label,
  name,
  ids,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  name: ApplicationField;
  ids: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`${ids}-${name}`}>
        {label}
        {required && <span className="text-muted-foreground font-normal"> (required)</span>}
      </Label>
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
