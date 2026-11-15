"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSubmitWithoutReset } from "@/lib/use-submit-without-reset";
import { deleteAccountAction, type DeleteAccountState } from "@/server/actions/account";

/** Typing the email address is the confirmation; the server checks it again. */
export function DeleteAccountForm({ email }: { email: string }) {
  const [state, formAction, pending] = useActionState<DeleteAccountState, FormData>(
    deleteAccountAction,
    {},
  );
  const onSubmit = useSubmitWithoutReset(formAction);
  const [typed, setTyped] = useState("");
  const matches = typed.trim().toLowerCase() === email.toLowerCase();

  return (
    <form action={formAction} onSubmit={onSubmit} className="flex max-w-md flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirm-email">
          Type <span className="font-mono">{email}</span> to confirm
        </Label>
        <Input
          id="confirm-email"
          name="confirmEmail"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "confirm-email-error" : undefined}
        />
        {state.error && (
          <p id="confirm-email-error" role="alert" className="text-destructive text-xs">
            {state.error}
          </p>
        )}
      </div>
      <Button type="submit" variant="destructive" className="w-fit" disabled={!matches || pending}>
        {pending ? "Deleting…" : "Delete my account and data"}
      </Button>
    </form>
  );
}
