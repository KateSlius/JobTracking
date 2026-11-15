import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ApplicationForm } from "@/components/applications/application-form";
import { applicationToFormValues } from "@/components/applications/form-values";
import { updateApplicationAction } from "@/server/actions/applications";
import { getApplication, getFormSuggestions } from "@/server/queries/applications";

export const metadata: Metadata = { title: "Edit application" };

async function EditForm({ params }: { params: PageProps<"/applications/[id]/edit">["params"] }) {
  const { id } = await params;
  const [app, suggestions] = await Promise.all([getApplication(id), getFormSuggestions()]);
  if (!app) notFound();

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">
        Edit {app.roleTitle} <span className="text-muted-foreground">at {app.company.name}</span>
      </h1>
      <p className="text-muted-foreground -mt-4 text-sm">
        To change the status, use &ldquo;Change status&rdquo; on the application page so it&apos;s
        recorded in the history.
      </p>
      <ApplicationForm
        mode="edit"
        action={updateApplicationAction.bind(null, app.id)}
        initialValues={applicationToFormValues(app)}
        suggestions={suggestions}
        cancelHref={`/applications/${app.id}`}
      />
    </>
  );
}

export default function EditApplicationPage({ params }: PageProps<"/applications/[id]/edit">) {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<div className="bg-muted h-96 max-w-3xl animate-pulse rounded-md" />}>
        <EditForm params={params} />
      </Suspense>
    </div>
  );
}
