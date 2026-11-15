import type { Metadata } from "next";
import { Suspense } from "react";
import { ApplicationForm } from "@/components/applications/application-form";
import { createApplicationAction } from "@/server/actions/applications";
import { getFormSuggestions } from "@/server/queries/applications";

export const metadata: Metadata = { title: "Add application" };

async function NewApplicationForm() {
  const suggestions = await getFormSuggestions();
  return (
    <ApplicationForm
      mode="create"
      action={createApplicationAction}
      suggestions={suggestions}
      cancelHref="/applications"
    />
  );
}

export default function NewApplicationPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Add application</h1>
      <Suspense fallback={<div className="bg-muted h-96 max-w-3xl animate-pulse rounded-md" />}>
        <NewApplicationForm />
      </Suspense>
    </div>
  );
}
