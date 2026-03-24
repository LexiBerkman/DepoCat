"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { updateDepositionNoteAction } from "@/lib/actions";

const NOTE_LIMIT = 200;
const AUTOSAVE_DELAY_MS = 700;

export function DepositionNoteField({
  depositionTargetId,
  initialNotes,
}: {
  depositionTargetId: string;
  initialNotes?: string | null;
}) {
  const [value, setValue] = useState(initialNotes ?? "");
  const [savedValue, setSavedValue] = useState(initialNotes ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [, startTransition] = useTransition();
  const saveTimeoutRef = useRef<number | null>(null);
  const savedBadgeTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (value === savedValue) {
      setStatus("idle");
      return;
    }

    setStatus("saving");

    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = window.setTimeout(() => {
      startTransition(async () => {
        const result = await updateDepositionNoteAction({
          depositionTargetId,
          notes: value,
        });

        if (result.error) {
          setStatus("error");
          setErrorMessage(result.error);
          return;
        }

        setSavedValue(result.notes);
        setValue(result.notes);
        setErrorMessage("");
        setStatus("saved");

        if (savedBadgeTimeoutRef.current) {
          window.clearTimeout(savedBadgeTimeoutRef.current);
        }

        savedBadgeTimeoutRef.current = window.setTimeout(() => {
          setStatus("idle");
        }, 1200);
      });
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [depositionTargetId, savedValue, startTransition, value]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }

      if (savedBadgeTimeoutRef.current) {
        window.clearTimeout(savedBadgeTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="deposition-note">
      <textarea
        className="field deposition-note-input"
        value={value}
        maxLength={NOTE_LIMIT}
        rows={2}
        placeholder="Brief note for this deponent..."
        onChange={(event) => {
          setValue(event.target.value.slice(0, NOTE_LIMIT));
          if (status === "error") {
            setStatus("idle");
            setErrorMessage("");
          }
        }}
      />
      <div className="deposition-note-meta">
        <span className="muted small">{value.length}/{NOTE_LIMIT}</span>
        {status === "saving" ? <span className="muted small">Saving...</span> : null}
        {status === "saved" ? <span className="success small">Saved</span> : null}
        {status === "error" ? <span className="error small">{errorMessage}</span> : null}
      </div>
    </div>
  );
}
