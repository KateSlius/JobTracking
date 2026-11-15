import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteAccountForm } from "@/components/settings/delete-account-form";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Privacy and data" };

async function DeleteSection() {
  const user = await requireUser();
  return <DeleteAccountForm email={user.email} />;
}

export default function PrivacySettingsPage() {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Link
        href="/settings"
        className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-4" aria-hidden /> Settings
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Privacy and data</h1>
      <p className="text-muted-foreground text-sm">
        Under UK GDPR you can get a copy of your data and ask for it to be deleted. You can do both
        here, straight away. Read the{" "}
        <Link href="/privacy" className="underline underline-offset-4">
          privacy policy
        </Link>{" "}
        for what we keep and why.
      </p>
      <Card>
        <CardHeader>
          <CardTitle>Download your data</CardTitle>
          <CardDescription>
            A ZIP with every application, status change, interview, reminder, contact and note, as
            spreadsheet-friendly CSV files and one JSON file.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" render={<a href="/api/export" download />}>
            <Download /> Download my data
          </Button>
        </CardContent>
      </Card>
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle>Delete your account</CardTitle>
          <CardDescription>
            This permanently deletes your account and everything in it, immediately. It can&apos;t
            be undone, so download your data first if you want to keep it. We&apos;ll email you to
            confirm.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="bg-muted h-24 animate-pulse rounded-md" />}>
            <DeleteSection />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
