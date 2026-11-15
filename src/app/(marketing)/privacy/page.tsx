import type { Metadata } from "next";
import Link from "next/link";
import { Fill, LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = { title: "Privacy policy" };

// Draft. Everything describing what the app does is accurate to the code; the highlighted
// [placeholders] are for the operator to complete, and the whole page should be reviewed before
// launch.
export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Privacy policy" updated="15 November 2026">
      <p>
        This explains what Job Tracker keeps about you, why, who else handles it, and your rights
        under the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.
      </p>

      <h2>Who we are</h2>
      <p>
        Job Tracker is run by <Fill>your name or company, and company number if any</Fill>, the data
        controller. Contact us at <Fill>privacy contact email</Fill>.
      </p>

      <h2>What we keep</h2>
      <ul>
        <li>
          <strong>Your account:</strong> email address, name, and profile picture if you sign in
          with Google.
        </li>
        <li>
          <strong>What you add:</strong> applications, companies, recruiter contacts, salaries,
          interviews, reminders, notes and CV or cover letter version names.
        </li>
        <li>
          <strong>Sign-in records:</strong> active sessions and, if you use Google, a link to your
          Google account.
        </li>
      </ul>
      <p>
        Recruiter contact details are about other people. Only add what you need to manage your
        application.
      </p>

      <h2>Why we use it (lawful basis)</h2>
      <ul>
        <li>
          <strong>To provide the service</strong> you signed up for (contract): storing your data,
          showing your dashboard and calendar, and sending sign-in links.
        </li>
        <li>
          <strong>Reminder emails</strong> are optional. They&apos;re on by default and you can turn
          them off at any time in Settings or from any reminder email.
        </li>
      </ul>
      <p>We don&apos;t sell your data, show adverts, or use it to train AI models.</p>

      <h2>Cookies</h2>
      <p>
        We use one essential cookie to keep you signed in, plus short-lived ones during sign-in.
        There are no analytics, advertising or tracking cookies, so there&apos;s no cookie banner.
      </p>

      <h2>Who else handles your data</h2>
      <p>These suppliers process data for us, only to run the service:</p>
      <ul>
        <li>
          <strong>Hosting:</strong> Vercel Inc. <Fill>confirm region and transfer safeguard</Fill>
        </li>
        <li>
          <strong>Database:</strong> <Fill>provider, e.g. Neon, London (eu-west-2)</Fill>
        </li>
        <li>
          <strong>Email:</strong> Resend <Fill>confirm region and transfer safeguard</Fill>
        </li>
        <li>
          <strong>Google sign-in</strong>, if you choose it: Google receives the fact that you
          signed in to Job Tracker.
        </li>
      </ul>

      <h2>How long we keep it</h2>
      <p>
        Until you delete your account. Deleting it removes everything immediately from the live
        database. Copies in our database provider&apos;s backups are overwritten within{" "}
        <Fill>backup retention period</Fill>.
      </p>

      <h2>Your rights</h2>
      <ul>
        <li>
          <strong>Access and portability:</strong> download everything as a ZIP from{" "}
          <Link href="/settings/privacy">Settings → Privacy and data</Link>.
        </li>
        <li>
          <strong>Correction:</strong> edit anything in the app, or ask us.
        </li>
        <li>
          <strong>Erasure:</strong> delete your account from the same page; it&apos;s immediate.
        </li>
        <li>
          <strong>Objection and restriction:</strong> contact us.
        </li>
      </ul>
      <p>
        If you&apos;re unhappy with how we handle your data, you can complain to the Information
        Commissioner&apos;s Office at <a href="https://ico.org.uk/make-a-complaint/">ico.org.uk</a>.
        We&apos;d appreciate the chance to sort it out first.
      </p>
    </LegalPage>
  );
}
