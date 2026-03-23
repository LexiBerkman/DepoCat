"use client";

import { format } from "date-fns";
import { useActionState, useEffect, useRef } from "react";

import { updateScheduledDateAction } from "@/lib/actions";

const initialState = {
  error: "",
  success: "",
  scheduledDateValue: "",
  followUpStage: "",
  followUpDueDateValue: "",
};

function toInputValue(date: Date | null) {
  if (!date) {
    return "";
  }

  const d = new Date(date);
  // Reject bogus Excel zero-dates (e.g. 1899-12-30 serial 0)
  if (d.getFullYear() < 1900) {
    return "";
  }

  return format(d, "MM/dd/yyyy");
}

export function ScheduledDateForm({
  depositionTargetId,
  scheduledDate,
  onUpdated,
}: {
  depositionTargetId: string;
  scheduledDate: Date | null;
  onUpdated?: (payload: {
    scheduledDateValue: string;
    followUpStage: string;
    followUpDueDateValue: string;
  }) => void;
}) {
  const [state, formAction, pending] = useActionState(updateScheduledDateAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.success || !onUpdated) {
      return;
    }

    onUpdated({
      scheduledDateValue: state.scheduledDateValue,
      followUpStage: state.followUpStage,
      followUpDueDateValue: state.followUpDueDateValue,
    });
  }, [onUpdated, state.followUpDueDateValue, state.followUpStage, state.scheduledDateValue, state.success]);

  return (
    <form ref={formRef} action={formAction} className="stack scheduled-form">
      <input type="hidden" name="depositionTargetId" value={depositionTargetId} />
      <input
        className="field"
        type="text"
        name="scheduledDate"
        inputMode="numeric"
        placeholder="mm/dd/yyyy"
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
