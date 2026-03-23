"use client";

import { format } from "date-fns";
import { useActionState } from "react";

import { updateScheduledDateAction } from "@/lib/actions";

const initialState = {
  error: "",
  success: "",
};

function toInputValue(date: Date | null) {
  if (!date) {
    return "";
  }

  return format(new Date(date), "dd/MM/yyyy");
}

export function ScheduledDateForm({
  depositionTargetId,
  scheduledDate,
}: {
  depositionTargetId: string;
  scheduledDate: Date | null;
}) {
  const [state, formAction, pending] = useActionState(updateScheduledDateAction, initialState);

  return (
    <form action={formAction} className="stack scheduled-form">
      <input type="hidden" name="depositionTargetId" value={depositionTargetId} />
      <input
        className="field"
        type="text"
        name="scheduledDate"
        inputMode="numeric"
        placeholder="dd/mm/yyyy"
        defaultValue={toInputValue(scheduledDate)}
      />
      <div className="row-wrap">
        <button className="button-secondary small-button" type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save"}
        </button>
        <button
          className="button-secondary small-button"
          type="submit"
          name="scheduledDate"
          value=""
          disabled={pending}
        >
          Clear
        </button>
      </div>
      {state.error ? <span className="error small">{state.error}</span> : null}
      {state.success ? <span className="success small">{state.success}</span> : null}
    </form>
  );
}
