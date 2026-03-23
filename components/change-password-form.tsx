"use client";

import { useActionState } from "react";

import { changePasswordAction } from "@/lib/actions";

const initialState = {
  error: "",
  success: "",
};

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, initialState);

  return (
    <form action={formAction} className="stack">
      <div className="form-grid">
        <label className="label">
          Current password
          <input className="field" name="currentPassword" type="password" required />
        </label>
        <label className="label">
          New password
          <input className="field" name="newPassword" type="password" minLength={14} required />
        </label>
      </div>
      <div className="form-grid-wide">
        <label className="label">
          Confirm new password
          <input className="field" name="confirmPassword" type="password" minLength={14} required />
        </label>
      </div>
      <p className="small muted">
        Use at least 14 characters. A password manager-generated password is best.
      </p>
      {state.error ? <p className="error">{state.error}</p> : null}
      {state.success ? <p className="success">{state.success}</p> : null}
      <button className="button" type="submit" disabled={pending}>
        {pending ? "Updating..." : "Change password"}
      </button>
    </form>
  );
}
