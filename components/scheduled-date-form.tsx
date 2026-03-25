"use client";

import { format } from "date-fns";
import { useEffect, useRef, useState, useTransition } from "react";

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
  const initialValue = toInputValue(scheduledDate);
  const [value, setValue] = useState(initialValue);
  const [savedValue, setSavedValue] = useState(initialValue);
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<number | null>(null);
  const savedBadgeTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const nextValue = toInputValue(scheduledDate);
    setValue(nextValue);
    setSavedValue(nextValue);
    setIsEditing(false);
    setStatus("idle");
    setErrorMessage("");
  }, [scheduledDate]);

  function clearTimers() {
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    if (savedBadgeTimeoutRef.current) {
      window.clearTimeout(savedBadgeTimeoutRef.current);
      savedBadgeTimeoutRef.current = null;
    }
  }

  function saveDate(nextValue: string) {
    const trimmedValue = nextValue.trim();

    if (trimmedValue === savedValue.trim()) {
      setStatus("idle");
      return;
    }

    clearTimers();
    setStatus("saving");
    setErrorMessage("");

    startTransition(async () => {
      const formData = new FormData();
      formData.set("depositionTargetId", depositionTargetId);
      formData.set("scheduledDate", trimmedValue);

      const result = await updateScheduledDateAction(initialState, formData);

      if (result.error) {
        setStatus("error");
        setErrorMessage(result.error);
        return;
      }

      setValue(result.scheduledDateValue);
      setSavedValue(result.scheduledDateValue);
      setIsEditing(false);
      setErrorMessage("");
      setStatus("saved");
      onUpdated?.({
        scheduledDateValue: result.scheduledDateValue,
        followUpStage: result.followUpStage,
        followUpDueDateValue: result.followUpDueDateValue,
      });

      savedBadgeTimeoutRef.current = window.setTimeout(() => {
        setStatus("idle");
      }, 1200);
    });
  }

  useEffect(() => {
    if (!isEditing || value.trim() === savedValue.trim()) {
      return;
    }

    saveTimeoutRef.current = window.setTimeout(() => {
      saveDate(value);
    }, 700);

    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [isEditing, savedValue, value]);

  useEffect(() => () => clearTimers(), []);

  return (
    <div className="stack scheduled-form">
      <input
        ref={inputRef}
        className="field"
        type="text"
        inputMode="numeric"
        placeholder="mm/dd/yyyy"
        value={value}
        readOnly={!isEditing}
        onChange={(event) => {
          setValue(event.target.value);
          if (status === "error") {
            setStatus("idle");
            setErrorMessage("");
          }
        }}
        onBlur={() => {
          if (isEditing && value.trim() !== savedValue.trim()) {
            saveDate(value);
          }
        }}
      />
      <button
        className="button-secondary small-button scheduled-change-button"
        type="button"
        disabled={isPending}
        onClick={() => {
          setIsEditing(true);
          window.requestAnimationFrame(() => {
            inputRef.current?.focus();
            inputRef.current?.select();
          });
        }}
      >
        {isPending ? "Saving..." : "Change date"}
      </button>
      <span className="muted small">Delete the date and pause to clear it.</span>
      {status === "saving" ? <span className="muted small">Saving...</span> : null}
      {status === "saved" ? <span className="success small">Saved</span> : null}
      {status === "error" ? <span className="error small">{errorMessage}</span> : null}
    </div>
  );
}
