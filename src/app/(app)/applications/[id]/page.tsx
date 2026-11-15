import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { ArrowLeft, ExternalLink, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteApplicationButton } from "@/components/applications/delete-application-button";
import { StatusBadge } from "@/components/applications/status-badge";
import { StatusChanger } from "@/components/applications/status-changer";
import { StatusTimeline } from "@/components/applications/status-timeline";
import {
  CONTRACT_TYPE_LABEL,
  IR35_LABEL,
  LOCATION_TYPE_LABEL,
  SOURCE_LABEL,
} from "@/lib/constants";
import { formatCalendarDate, formatSalary } from "@/lib/format";
import { changeStatusAction, deleteApplicationAction } from "@/server/actions/applications";
import { getApplication, type ApplicationDetail } from "@/server/queries/applications";

export const metadata: Metadata = { title: "Application" };

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-sm">{children ?? <span className="text-muted-foreground">—</span>}</dd>
    </div>
  );
}

function locationText(app: ApplicationDetail) {
  const type = app.locationType ? LOCATION_TYPE_LABEL[app.locationType] : null;
  return [app.city, type].filter(Boolean).join(" · ") || null;
}

function sourceText(app: ApplicationDetail) {
  if (!app.source) return null;
  return app.source === "OTHER" && app.sourceOther ? app.sourceOther : SOURCE_LABEL[app.source];
}

function contractText(app: ApplicationDetail) {
  if (!app.contractType) return null;
  const type = CONTRACT_TYPE_LABEL[app.contractType];
  return app.ir35Status ? `${type} · ${IR35_LABEL[app.ir35Status]}` : type;
}

async function ApplicationView({ params }: { params: PageProps<"/applications/[id]">["params"] }) {
  const { id } = await params;
  const app = await getApplication(id);
  if (!app) notFound();

  const label = `${app.roleTitle} at ${app.company.name}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-muted-foreground text-sm">{app.company.name}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{app.roleTitle}</h1>
          <div className="mt-1">
            <StatusBadge status={app.status} />
          </div>
        </div>
        <div className="flex gap-2">
          {app.jobUrl && (
            <Button
              variant="outline"
              render={<a href={app.jobUrl} target="_blank" rel="noopener noreferrer" />}
            >
              <ExternalLink /> Job advert
            </Button>
          )}
          <Button variant="outline" render={<Link href={`/applications/${app.id}/edit`} />}>
            <Pencil /> Edit
          </Button>
          <DeleteApplicationButton
            action={deleteApplicationAction.bind(null, app.id)}
            label={label}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Job details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Detail label="Location">{locationText(app)}</Detail>
                <Detail label="Salary">
                  {formatSalary(app.salaryMinPence, app.salaryMaxPence, app.salaryPeriod)}
                </Detail>
                <Detail label="Contract">{contractText(app)}</Detail>
                <Detail label="Visa sponsorship">
                  {app.visaSponsorshipRequired ? "Needed" : "Not needed"}
                </Detail>
                <Detail label="Source">{sourceText(app)}</Detail>
                <Detail label="Closing date">
                  {app.closingDate ? formatCalendarDate(app.closingDate) : null}
                </Detail>
                <Detail label="Date applied">
                  {app.appliedOn ? formatCalendarDate(app.appliedOn) : null}
                </Detail>
                <Detail label="CV / cover letter">
                  {[app.cvVersion?.label, app.coverLetterVersion?.label]
                    .filter(Boolean)
                    .join(" · ") || null}
                </Detail>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recruiter or contact</CardTitle>
            </CardHeader>
            <CardContent>
              {app.contact ? (
                <dl className="grid gap-4 sm:grid-cols-2">
                  <Detail label="Name">{app.contact.name}</Detail>
                  <Detail label="Agency">{app.contact.agencyName}</Detail>
                  <Detail label="Email">
                    {app.contact.email && (
                      <a
                        href={`mailto:${app.contact.email}`}
                        className="underline underline-offset-4"
                      >
                        {app.contact.email}
                      </a>
                    )}
                  </Detail>
                  <Detail label="Phone">
                    {app.contact.phone && (
                      <a
                        href={`tel:${app.contact.phone.replace(/\s+/g, "")}`}
                        className="underline underline-offset-4"
                      >
                        {app.contact.phone}
                      </a>
                    )}
                  </Detail>
                </dl>
              ) : (
                <p className="text-muted-foreground text-sm">No contact added.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              {app.notes ? (
                <p className="text-sm whitespace-pre-line">{app.notes}</p>
              ) : (
                <p className="text-muted-foreground text-sm">No notes yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Change status</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusChanger current={app.status} action={changeStatusAction.bind(null, app.id)} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>History</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusTimeline changes={app.statusChanges} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function ApplicationPage({ params }: PageProps<"/applications/[id]">) {
  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/applications"
        className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-4" /> All applications
      </Link>
      <Suspense fallback={<div className="bg-muted h-96 animate-pulse rounded-md" />}>
        <ApplicationView params={params} />
      </Suspense>
    </div>
  );
}
