import { DemoButton } from "@/components/marketing/demo-button";
import { LinkButton } from "@/components/ui/link-button";

export default function LandingPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-start justify-center gap-6 px-4 py-16">
      <p className="text-muted-foreground text-sm font-medium">For job seekers in the UK</p>
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        Keep every application, interview and follow-up in one place.
      </h1>
      <p className="text-muted-foreground max-w-xl text-lg">
        Track roles from LinkedIn, Indeed, Reed and agencies. See your pipeline at a glance, never
        miss a closing date, and add interviews straight to your calendar.
      </p>
      <div className="flex flex-wrap items-start gap-3">
        <DemoButton variant="default" />
        <LinkButton size="lg" variant="outline" href="/login">
          Sign in
        </LinkButton>
      </div>
      <p className="text-muted-foreground text-sm">
        The demo gives you a private account with a sample job search, so you can try everything
        straight away. No sign-up needed; it&apos;s deleted after 24 hours.
      </p>
    </main>
  );
}
