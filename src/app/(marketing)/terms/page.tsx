import type { Metadata } from "next";
import Link from "next/link";
import { Fill, LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = { title: "Terms" };

// Draft for review before launch; see the note in privacy/page.tsx.
export default function TermsPage() {
  return (
    <LegalPage title="Terms of use" updated="15 November 2026">
      <p>
        By using Job Tracker you agree to these terms. They&apos;re short because the service is
        simple.
      </p>
      <h2>The service</h2>
      <p>
        Job Tracker helps you keep track of job applications. It&apos;s provided by{" "}
        <Fill>your name or company</Fill> <Fill>free of charge / price</Fill>, as it is. We work to
        keep it running and your data safe, but can&apos;t promise it will always be available or
        error-free.
      </p>
      <h2>Your data</h2>
      <p>
        What you add is yours. You can download or delete it at any time; see the{" "}
        <Link href="/privacy">privacy policy</Link>. Reminders are a helpful nudge, not a guarantee:
        always check closing dates and interview times with the employer.
      </p>
      <h2>Using it fairly</h2>
      <p>
        Don&apos;t use it to break the law, to store other people&apos;s data you have no reason to
        hold, or to try to access anyone else&apos;s account.
      </p>
      <h2>Changes and ending</h2>
      <p>
        We may update these terms and will say so in the app. You can stop using Job Tracker and
        delete your account whenever you like.
      </p>
      <h2>Law</h2>
      <p>
        These terms are governed by the law of{" "}
        <Fill>England and Wales / Scotland / Northern Ireland</Fill>. Questions:{" "}
        <Fill>contact email</Fill>.
      </p>
    </LegalPage>
  );
}
