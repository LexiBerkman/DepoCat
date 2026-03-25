"use client";

import { Save } from "lucide-react";
import { useActionState, useEffect } from "react";

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
  isEditing = false,
  onStartEditing,
  onStopEditing,
}: {
  matterId: string;
  counselEmails: string[];
  onUpdated?: (emails: string[]) => void;
  isEditing?: boolean;
  onStartEditing?: () => void;
  onStopEditing?: () => void;
}) {
  const [state, formAction, pending] = useActionState(updateCounselEmailsAction, initialState);

  useEffect(() => {
    if (!state.success) {
      return;
    }

    onStopEditing?.();
    onUpdated?.(
      state.counselEmailsValue
        .split(";")
        .map((value) => value.trim())
        .filter(Boolean),
    );
  }, [onStopEditing, onUpdated, state.counselEmailsValue, state.success]);

  if (!isEditing) {
    return null;
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
          placeholder="alex@firm.com; jordan@firm.com"
          defaultValue={counselEmails.join("; ")}
        />
      </label>
      <span className="muted small">Separate addresses with semicolons, commas, or line breaks.</span>
      <div className="row-wrap">
        <button className="button-secondary small-button" type="submit" disabled={pending}>
          <Save size={14} />
          {pending ? "Saving..." : "Save emails"}
        </button>
        <button className="button-secondary small-button" type="button" onClick={onStopEditing}>
          Cancel
        </button>
      </div>
      {state.error ? <span className="error small">{state.error}</span> : null}
    </form>
  );
}
