import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ApplicationNotFound() {
  return (
    <div className="flex max-w-md flex-col items-start gap-3 py-12">
      <h1 className="text-xl font-semibold">Application not found</h1>
      <p className="text-muted-foreground text-sm">
        It may have been deleted, or it belongs to a different account.
      </p>
      <Button variant="outline" render={<Link href="/applications" />}>
        Back to your applications
      </Button>
    </div>
  );
}
