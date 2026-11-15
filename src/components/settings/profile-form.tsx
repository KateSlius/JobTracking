"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSubmitWithoutReset } from "@/lib/use-submit-without-reset";
import { updateProfileAction, type ProfileState } from "@/server/actions/account";

export function ProfileForm({ name, email }: { name: string | null; email: string }) {
  const [state, formAction, pending] = useActionState<ProfileState, FormData>(
    updateProfileAction,
    {},
  );
  const onSubmit = useSubmitWithoutReset(formAction);
  useEffect(() => {
    if (state.savedAt) toast.success("Profile saved");
  }, [state.savedAt]);

  return (
    <form action={formAction} onSubmit={onSubmit} className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="profile-name">Name</Label>
        <Input
          id="profile-name"
          name="name"
          defaultValue={state.name ?? name ?? ""}
          autoComplete="name"
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "profile-name-error" : undefined}
        />
        {state.error && (
          <p id="profile-name-error" className="text-destructive text-xs">
            {state.error}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="profile-email">Email</Label>
        <Input id="profile-email" value={email} readOnly disabled />
        <p className="text-muted-foreground text-xs">
          This is how you sign in, so it can&apos;t be changed here.
        </p>
      </div>
      <Button type="submit" className="w-fit" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
