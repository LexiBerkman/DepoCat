"use client";

import { useActionState } from "react";

import { loginAction } from "@/lib/actions";

const initialState = {
  error: "",
};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="stack">
      <label className="label">
        Secure email
        <input className="field" name="email" type="email" required />
      </label>
      <label className="label">
        Password
        <input className="field" name="password" type="password" required />
      </label>
      {state.error ? <p className="error">{state.error}</p> : null}
      <button className="button" type="submit" disabled={pending}>
        {pending ? "Unlocking..." : "Unlock DepoCat"}
      </button>
    </form>
  );
}
