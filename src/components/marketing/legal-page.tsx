import type { ReactNode } from "react";

/** Shared layout for the privacy policy and terms: readable line length, clear headings. */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="text-muted-foreground mt-2 text-sm">Last updated {updated}</p>
      <div className="mt-6 text-[15px] leading-relaxed [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mt-8 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:mt-1 [&_p]:mt-3 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5">
        {children}
      </div>
    </main>
  );
}

/** Text the operator must fill in before launch. Highlighted so it can't be missed. */
export function Fill({ children }: { children: ReactNode }) {
  return (
    <mark className="rounded bg-amber-100 px-1 text-amber-950 dark:bg-amber-900 dark:text-amber-50">
      [{children}]
    </mark>
  );
}
