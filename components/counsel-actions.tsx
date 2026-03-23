"use client";

import { Copy, Mail } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { buildEmailDraft, type EmailTemplateKey } from "@/lib/email-templates";

export function CounselActions({
  emails,
  deponentName,
  clientName,
  referenceNumber,
  draftTemplate,
  lastSentDateLabel,
  isScheduled,
}: {
  emails: string[];
  deponentName: string;
  clientName: string;
  referenceNumber: string;
  draftTemplate: EmailTemplateKey;
  lastSentDateLabel?: string | null;
  isScheduled?: boolean;
}) {
  const [copiedItem, setCopiedItem] = useState<"emails" | "draft" | null>(null);
  const [emailSelectPrompt, setEmailSelectPrompt] = useState(false);
  const [showDraftFallback, setShowDraftFallback] = useState(false);
  const emailFieldRef = useRef<HTMLInputElement>(null);
  const fallbackTextareaRef = useRef<HTMLTextAreaElement>(null);

  const emailList = useMemo(() => emails.join("; "), [emails]);
  const draft = useMemo(
    () =>
      buildEmailDraft({
        template: draftTemplate,
        deponentName,
        clientName,
        referenceNumber,
        lastSentDateLabel,
      }),
    [clientName, deponentName, draftTemplate, lastSentDateLabel, referenceNumber],
  );

  // Auto-select the fallback textarea as soon as the modal appears
  useEffect(() => {
    if (showDraftFallback && fallbackTextareaRef.current) {
      fallbackTextareaRef.current.focus();
      fallbackTextareaRef.current.select();
      fallbackTextareaRef.current.setSelectionRange(0, fallbackTextareaRef.current.value.length);
    }
  }, [showDraftFallback]);

  async function copyEmails() {
    if (!emails.length) return;
    setEmailSelectPrompt(false);

    try {
      // Call writeText directly — do NOT focus/select before this or Chrome
      // revokes the user-gesture clipboard permission.
      await navigator.clipboard.writeText(emailList);
      setCopiedItem("emails");
      setTimeout(() => setCopiedItem(null), 1500);
    } catch {
      // Clipboard API unavailable or denied — select the visible field so
      // the user can immediately press Cmd/Ctrl+C.
      setEmailSelectPrompt(true);
      emailFieldRef.current?.focus();
      emailFieldRef.current?.select();
      emailFieldRef.current?.setSelectionRange(0, emailFieldRef.current.value.length);
    }
  }

  async function copyDraft() {
    try {
      await navigator.clipboard.writeText(draft);
      setCopiedItem("draft");
      setTimeout(() => setCopiedItem(null), 1500);
    } catch {
      // Clipboard API unavailable or denied — show the temporary modal so
      // the user can select-all and Cmd/Ctrl+C from the pre-selected textarea.
      setShowDraftFallback(true);
    }
  }

  return (
    <div className="stack">
      <div className="counsel-btn-row">
        <button
          className="link-chip small-button"
          type="button"
          onClick={copyEmails}
          disabled={!emails.length}
        >
          <Copy size={14} />
          {copiedItem === "emails" ? "Copied!" : "Copy emails"}
        </button>
        {!isScheduled && (
          <button
            className="link-chip small-button"
            type="button"
            onClick={copyDraft}
          >
            <Mail size={14} />
            {copiedItem === "draft" ? "Copied!" : "Draft email"}
          </button>
        )}
      </div>

      <input
        ref={emailFieldRef}
        className="field counsel-email-field"
        type="text"
        value={emails.length ? emailList : "No counsel emails saved"}
        readOnly
        onClick={() => {
          if (emails.length) {
            emailFieldRef.current?.select();
          }
        }}
      />

      {emailSelectPrompt && (
        <span className="small muted">Field selected — press Cmd/Ctrl+C to copy.</span>
      )}

      {showDraftFallback && (
        <div className="draft-fallback-overlay" role="dialog" aria-modal="true" aria-label="Copy draft email">
          <div className="draft-fallback-panel">
            <div className="row">
              <strong className="small">Copy draft manually</strong>
              <button
                className="link-chip small-button"
                type="button"
                onClick={() => setShowDraftFallback(false)}
              >
                ✕ Close
              </button>
            </div>
            <p className="small muted" style={{ margin: 0 }}>
              Auto-copy failed. The text below is selected — press Cmd/Ctrl+C, then close.
            </p>
            <textarea
              ref={fallbackTextareaRef}
              className="field counsel-assist-field"
              value={draft}
              readOnly
              rows={10}
              onClick={() => {
                fallbackTextareaRef.current?.select();
                fallbackTextareaRef.current?.setSelectionRange(0, fallbackTextareaRef.current.value.length);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
