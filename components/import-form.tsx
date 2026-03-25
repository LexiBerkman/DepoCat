"use client";

import { useActionState } from "react";

import { importWorkbookAction } from "@/lib/actions";

const initialState = {
  error: "",
  success: "",
};

export function ImportForm() {
  const [state, formAction, pending] = useActionState(importWorkbookAction, initialState);

  return (
    <form action={formAction} className="stack">
      <label className="label">
        Upload Excel spreadsheet
        <input className="file-input" type="file" name="file" accept=".xlsx,.csv" required />
      </label>
      <p className="small muted">
        Recommended columns: Reference Number, Client Name, Deponent Name, Deponent Role,
        Requested Date, Scheduled Date, Counsel Name, Counsel Email, Counsel Firm, Notes.
        Common variations like `Reference`, `Client`, `Deponent`, `Attorney Name`, and `Attorney Email`
        are now accepted too. Use `.xlsx` or `.csv` and keep the file under 10 MB.
      </p>
      {state.error ? <p className="error">{state.error}</p> : null}
      {state.success ? <p>{state.success}</p> : null}
      <button className="button" type="submit" disabled={pending}>
        {pending ? "Importing..." : "Import workbook"}
      </button>
    </form>
  );
}
