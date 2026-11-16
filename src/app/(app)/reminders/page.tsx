import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmailToggle } from "@/components/reminders/email-toggle";
import { NoReminders, ReminderItem } from "@/components/reminders/reminder-item";
import { ReminderForm } from "@/components/reminders/reminder-form";
import { getRemindersPage } from "@/server/queries/reminders";

export const metadata: Metadata = { title: "Reminders" };

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

async function RemindersContent() {
  const d = await getRemindersPage();
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="flex flex-col gap-6 lg:col-span-2">
        <Section title="Overdue">
          {d.overdue.length ? (
            <ul className="flex flex-col divide-y">
              {d.overdue.map((r) => (
                <ReminderItem key={r.id} reminder={r} overdue />
              ))}
            </ul>
          ) : (
            <NoReminders>Nothing overdue. Nice work.</NoReminders>
          )}
        </Section>
        <Section title="Coming up" description="Next 60 days">
          {d.upcoming.length ? (
            <ul className="flex flex-col divide-y">
              {d.upcoming.map((r) => (
                <ReminderItem key={r.id} reminder={r} />
              ))}
            </ul>
          ) : (
            <NoReminders>No reminders coming up.</NoReminders>
          )}
        </Section>
        {d.done.length > 0 && (
          <Section title="Done recently" description="Last 14 days">
            <ul className="flex flex-col divide-y">
              {d.done.map((r) => (
                <ReminderItem key={r.id} reminder={r} />
              ))}
            </ul>
          </Section>
        )}
      </div>
      <div className="flex flex-col gap-6">
        <Section title="Add a reminder">
          <ReminderForm applications={d.applications} />
        </Section>
        <Section
          title="Email"
          description="Reminders always show here and under the bell. Email is optional."
        >
          <EmailToggle enabled={d.emailRemindersEnabled} demo={d.isDemo} />
        </Section>
        <Section title="Automatic reminders">
          <ul className="text-muted-foreground flex list-disc flex-col gap-1 pl-4 text-sm">
            <li>3 days before a saved role&apos;s closing date</li>
            <li>7 days after applying, if you haven&apos;t heard back</li>
            <li>The day before each interview, to prepare</li>
          </ul>
          <p className="text-muted-foreground mt-2 text-xs">
            All at 09:00 UK time. They update when the application changes.
          </p>
        </Section>
      </div>
    </div>
  );
}

export default function RemindersPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Reminders</h1>
      <Suspense fallback={<div className="bg-muted h-96 animate-pulse rounded-lg" />}>
        <RemindersContent />
      </Suspense>
    </div>
  );
}
