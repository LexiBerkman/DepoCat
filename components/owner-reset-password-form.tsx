"use client";

import { useActionState } from "react";

import { ownerResetPasswordAction } from "@/lib/actions";

const initialState = {
  error: "",
  success: "",
  temporaryPassword: "",
  targetEmail: "",
};

type UserOption = {
  id: string;
  email: string;
  fullName: string;
  role: "OWNER" | "PARALEGAL";
};

export function OwnerResetPasswordForm({ users }: { users: UserOption[] }) {
  const [state, formAction, pending] = useActionState(ownerResetPasswordAction, initialState);

  return (
    <form action={formAction} className="stack">
      <label className="label">
        User to reset
        <select className="field" name="targetUserId" defaultValue="" required>
          <option value="" disabled>
            Select a user
          </option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.fullName} ({user.email}) {user.role === "OWNER" ? "Owner" : "Paralegal"}
            </option>
          ))}
        </select>
      </label>
      <p className="small muted">
        This will generate a new temporary password and sign that user out of other active sessions.
      </p>
      {state.error ? <p className="error">{state.error}</p> : null}
      {state.success ? <p className="success">{state.success}</p> : null}
      {state.temporaryPassword ? (
        <div className="stat-card stack">
          <div className="small muted">Temporary password for {state.targetEmail}</div>
          <strong className="password-chip">{state.temporaryPassword}</strong>
        </div>
      ) : null}
      <button className="button" type="submit" disabled={pending}>
        {pending ? "Issuing reset..." : "Issue temporary password"}
      </button>
    </form>
  );
}
