import Link from "next/link";
import type { ComponentProps } from "react";
import type { VariantProps } from "class-variance-authority";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Links that look like buttons. Don't use <Button render={<Link />}> for these: Base UI's Button
 * puts button attributes on the link (type="button", or role="button" with nativeButton={false}),
 * so screen readers announce a link as a button. These stay real links with button styling.
 */

type Variants = VariantProps<typeof buttonVariants>;

/** In-app navigation (next/link, prefetched). */
export function LinkButton({
  variant,
  size,
  className,
  ...props
}: ComponentProps<typeof Link> & Variants) {
  return <Link className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

/** Downloads and external sites: a plain <a>, so nothing is prefetched. */
export function AnchorButton({
  variant,
  size,
  className,
  ...props
}: ComponentProps<"a"> & Variants) {
  return <a className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
