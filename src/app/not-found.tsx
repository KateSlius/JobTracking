import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-start justify-center gap-3 px-4 py-16">
      <p className="text-muted-foreground text-sm font-medium">404</p>
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-muted-foreground">It may have been deleted, or the link might be wrong.</p>
      <Button variant="outline" render={<Link href="/dashboard" />}>
        Go to your dashboard
      </Button>
    </main>
  );
}
