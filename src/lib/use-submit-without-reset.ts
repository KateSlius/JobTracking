"use client";

import { startTransition, type FormEvent } from "react";

/**
 * React 19 resets a `<form action={…}>` after every submission, even one that failed validation.
 * Inputs snap back to their default values, and a controlled <select> gets out of sync with the
 * state that drives it: the UI shows "In person" fields while the select silently submits "Phone".
 *
 * This submits through the same action without the reset, so what the person typed stays put.
 * Keep `action={formAction}` on the form too: without JavaScript it still posts normally.
 *
 *   <form action={formAction} onSubmit={useSubmitWithoutReset(formAction)}>
 */
export function useSubmitWithoutReset(formAction: (formData: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  };
}
