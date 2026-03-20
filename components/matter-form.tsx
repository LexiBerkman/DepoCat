"use client";

import { useActionState } from "react";

import { createMatterAction } from "@/lib/actions";

const initialState = {
  error: "",
};

export function MatterForm() {
  const [state, formAction, pending] = useActionState(createMatterAction, initialState);

  return (
    <form action={formAction} className="stack">
      <div className="form-grid">
        <label className="label">
          Reference number
          <input className="field" name="referenceNumber" placeholder="24-CV-101" required />
        </label>
        <label className="label">
          Client name
          <input className="field" name="clientName" placeholder="Jane Smith" required />
        </label>
        <label className="label">
          Deponent
          <input className="field" name="deponentName" placeholder="Corporate representative" required />
        </label>
        <label className="label">
          Deponent role
          <input className="field" name="deponentRole" placeholder="Treating physician" />
        </label>
        <label className="label">
          Opposing counsel
          <input className="field" name="counselName" placeholder="Alex Morgan" required />
        </label>
        <label className="label">
          Counsel email
          <input className="field" name="counselEmail" type="email" placeholder="alex@firm.com" required />
        </label>
      </div>
      <div className="form-grid-wide">
        <label className="label">
          Notes
          <textarea className="field" name="notes" rows={3} placeholder="Anything your paralegal should see immediately" />
        </label>
      </div>
      {state.error ? <p className="error">{state.error}</p> : null}
      <button className="button" type="submit" disabled={pending}>
        {pending ? "Saving..." : "Add matter"}
      </button>
    </form>
  );
}
