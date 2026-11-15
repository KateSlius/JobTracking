import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="text-muted-foreground border-t px-4 py-6 text-sm">
      <nav aria-label="Legal" className="mx-auto flex max-w-3xl flex-wrap gap-x-6 gap-y-2">
        <Link href="/privacy" className="hover:text-foreground">
          Privacy policy
        </Link>
        <Link href="/terms" className="hover:text-foreground">
          Terms
        </Link>
        <span>Made for job seekers in the UK</span>
      </nav>
    </footer>
  );
}
