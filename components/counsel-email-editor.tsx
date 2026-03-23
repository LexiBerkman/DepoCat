"use client";

import { Pencil, Save } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import { updateCounselEmailsAction } from "@/lib/actions";

const initialState = {
  error: "",
  success: "",
  counselEmailsValue: "",
};

export function CounselEmailEditor({
  matterId,
  counselEmails,
  onUpdated,
}: {
  matterId: string;
  counselEmails: string[];
  onUpdated?: (emails: string[]) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [state, formAction, pending] = useActionState(updateCounselEmailsAction, initialState);

  useEffect(() => {
    if (!state.success) {
      return;
    }

    setIsEditing(false);
    onUpdated?.(
      state.counselEmailsValue
        .split(";")
        .map((value) => value.trim())
        .filter(Boolean),
    );
  }, [onUpdated, state.counselEmailsValue, state.success]);

  if (!isEditing) {
    return (
      <button className="button-secondary small-button" type="button" onClick={() => setIsEditing(true)}>
        <Pencil size={14} />
        Edit emails
      </button>
    );
  }

  return (
    <form action={formAction} className="stack counsel-editor-form">
      <input type="hidden" name="matterId" value={matterId} />
      <label className="label small">
        Attorney emails
        <textarea
          className="field counsel-assist-field"
          name="counselEmails"
          rows={3}
          defaultValue={counselEmails.join("; ")}
        />
      </label>
      <div className="row-wrap">
        <button className="button-secondary small-button" type="submit" disabled={pending}>
          <Save size={14} />
          {pending ? "Saving..." : "Save emails"}
        </button>
        <button className="button-secondary small-button" type="button" onClick={() => setIsEditing(false)}>
          Cancel
        </button>
      </div>
      {state.error ? <span className="error small">{state.error}</span> : null}
    </form>
  );
}
