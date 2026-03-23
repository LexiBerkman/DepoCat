"use client";

import { useEffect } from "react";
import { useActionState } from "react";

import { logCommunicationAction } from "@/lib/actions";

const initialState = {
  error: "",
  success: "",
  communicationType: "",
  sentAt: "",
  followUpStage: "",
  followUpDueDateValue: "",
};

export function LogEmailForm({
  depositionTargetId,
  defaultType,
  onLogged,
}: {
  depositionTargetId: string;
  defaultType: "FIRST_REQUEST" | "SECOND_REQUEST" | "FINAL_NOTICE";
  onLogged?: (payload: {
    communicationType: "FIRST_REQUEST" | "SECOND_REQUEST" | "FINAL_NOTICE";
    sentAt: string;
    followUpStage: string;
    followUpDueDateValue: string;
  }) => void;
}) {
  const [state, formAction, pending] = useActionState(logCommunicationAction, initialState);

  useEffect(() => {
    if (!state.success || !state.communicationType || !onLogged) {
      return;
    }

    onLogged({
      communicationType: state.communicationType as "FIRST_REQUEST" | "SECOND_REQUEST" | "FINAL_NOTICE",
      sentAt: state.sentAt,
      followUpStage: state.followUpStage,
      followUpDueDateValue: state.followUpDueDateValue,
    });
  }, [onLogged, state.communicationType, state.followUpDueDateValue, state.followUpStage, state.sentAt, state.success]);

  return (
    <form action={formAction} className="row-wrap next-step-actions">
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
