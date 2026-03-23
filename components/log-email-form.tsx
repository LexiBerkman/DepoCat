"use client";

import { useActionState } from "react";

import { logCommunicationAction } from "@/lib/actions";

const initialState = {
  error: "",
  success: "",
};

export function LogEmailForm({
  depositionTargetId,
  defaultType,
}: {
  depositionTargetId: string;
  defaultType: "FIRST_REQUEST" | "SECOND_REQUEST" | "FINAL_NOTICE";
}) {
  const [state, formAction, pending] = useActionState(logCommunicationAction, initialState);

  return (
    <form action={formAction} className="row-wrap">
      <input type="hidden" name="depositionTargetId" value={depositionTargetId} />
      <button className="button-secondary small-button" type="submit" name="communicationType" value="FIRST_REQUEST" disabled={pending}>
        {pending && defaultType === "FIRST_REQUEST" ? "Logging..." : "Log 1st"}
      </button>
      <button className="button-secondary small-button" type="submit" name="communicationType" value="SECOND_REQUEST" disabled={pending}>
        {pending && defaultType === "SECOND_REQUEST" ? "Logging..." : "Log 2nd"}
      </button>
      <button className="button-secondary small-button" type="submit" name="communicationType" value="FINAL_NOTICE" disabled={pending}>
        {pending && defaultType === "FINAL_NOTICE" ? "Logging..." : "Log Final"}
      </button>
      {state.error ? <span className="error small">{state.error}</span> : null}
      {state.success ? <span className="success small">{state.success}</span> : null}
    </form>
  );
}
