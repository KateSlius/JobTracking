import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmailToggle } from "@/components/reminders/email-toggle";
import { DocumentList } from "@/components/settings/document-list";
import { ProfileForm } from "@/components/settings/profile-form";
import { getSettings } from "@/server/queries/settings";

export const metadata: Metadata = { title: "Settings" };

const PROVIDER_LABEL: Record<string, string> = { google: "Google", resend: "Email link" };

async function SettingsContent() {
  const { profile, documents } = await getSettings();
  const methods = [
    ...new Set(profile.accounts.map((a) => PROVIDER_LABEL[a.provider] ?? a.provider)),
  ];
  return (
    <div className="grid max-w-3xl gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          {methods.length > 0 && (
            <CardDescription>Signed in with {methods.join(" and ")}.</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <ProfileForm name={profile.name} email={profile.email} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Email reminders</CardTitle>
          <CardDescription>
            Reminders always show in the app.{" "}
            <Link href="/reminders" className="underline underline-offset-4">
              See your reminders
            </Link>
            .
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmailToggle enabled={profile.emailRemindersEnabled} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>CV and cover letter versions</CardTitle>
        </CardHeader>
        <CardContent>
          <DocumentList
            documents={documents.map((d) => ({
              id: d.id,
              kind: d.kind,
              label: d.label,
              uses: d._count.cvApplications + d._count.coverLetterApplications,
            }))}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Your data</CardTitle>
        </CardHeader>
        <CardContent>
          <Link
            href="/settings/privacy"
            className="hover:bg-muted -m-2 flex items-center gap-3 rounded-md p-2"
          >
            <ShieldCheck className="text-muted-foreground size-5" aria-hidden />
            <span className="flex flex-col">
              <span className="text-sm font-medium">Privacy and data</span>
              <span className="text-muted-foreground text-xs">
                Download a copy of your data or delete your account
              </span>
            </span>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <Suspense fallback={<div className="bg-muted h-96 max-w-3xl animate-pulse rounded-lg" />}>
        <SettingsContent />
      </Suspense>
    </div>
  );
}
