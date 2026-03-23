"use client";

import { Trash2 } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";

import { deleteDeponentAction } from "@/lib/actions";

const initialState = {
  error: "",
  success: "",
};

export function DeleteDeponentButton({
  depositionTargetId,
  deponentName,
  onDeleted,
}: {
  depositionTargetId: string;
  deponentName: string;
  onDeleted?: () => void;
}) {
  const [state, formAction, pending] = useActionState(deleteDeponentAction, initialState);
  const shouldRemoveRef = useRef(false);

  useEffect(() => {
    if (state.success && shouldRemoveRef.current && onDeleted) {
      shouldRemoveRef.current = false;
      onDeleted();
    }
  }, [onDeleted, state.success]);

  return (
    <form
      action={(formData) => {
        if (!window.confirm(`Delete ${deponentName} from the tracker?`)) {
          return;
        }

        shouldRemoveRef.current = true;
        formAction(formData);
      }}
      className="delete-deponent-form"
    >
      <input type="hidden" name="depositionTargetId" value={depositionTargetId} />
      <button className="button-secondary small-button delete-button" type="submit" disabled={pending}>
        <Trash2 size={14} />
        {pending ? "Deleting..." : "Delete"}
      </button>
      {state.error ? <span className="error small">{state.error}</span> : null}
    </form>
  );
}
