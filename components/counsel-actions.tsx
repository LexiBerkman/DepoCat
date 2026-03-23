"use client";

import { Copy, Mail } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { buildEmailDraft, type EmailTemplateKey } from "@/lib/email-templates";

/**
 * Synchronous clipboard copy via execCommand.
 *
 * Must be called directly inside a user-gesture handler (onclick), not inside
 * a then/await continuation. Returns true when the copy definitely succeeded.
 *
 * This is the primary copy path because:
 *  - It is synchronous — the user-gesture frame is still active.
 *  - It works over plain HTTP (no HTTPS requirement).
 *  - It works in every Chrome version.
 *  - It returns a reliable boolean — we know immediately whether it worked.
 */
function execCopy(text: string): boolean {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText =
      "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return !!ok;
  } catch {
    return false;
  }
}

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

  // Auto-select the fallback textarea as soon as the modal opens
  useEffect(() => {
    if (showDraftFallback && fallbackTextareaRef.current) {
      fallbackTextareaRef.current.focus();
      fallbackTextareaRef.current.select();
      fallbackTextareaRef.current.setSelectionRange(0, fallbackTextareaRef.current.value.length);
    }
  }, [showDraftFallback]);

  // Synchronous handler — runs inside the click event's user-gesture frame.
  function copyEmails() {
    if (!emails.length) return;
    setEmailSelectPrompt(false);

    // Primary path: synchronous execCommand — guaranteed to be in the gesture frame.
    if (execCopy(emailList)) {
      setCopiedItem("emails");
      setTimeout(() => setCopiedItem(null), 1500);
      return;
    }

    // Secondary path: async clipboard API (HTTPS / modern browsers).
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(emailList)
        .then(() => {
          setCopiedItem("emails");
          setTimeout(() => setCopiedItem(null), 1500);
        })
        .catch(() => {
          setEmailSelectPrompt(true);
          emailFieldRef.current?.focus();
          emailFieldRef.current?.select();
          emailFieldRef.current?.setSelectionRange(0, emailFieldRef.current.value.length);
        });
      return;
    }

    // Last resort: select the visible field so the user can press Cmd/Ctrl+C.
    setEmailSelectPrompt(true);
    emailFieldRef.current?.focus();
    emailFieldRef.current?.select();
    emailFieldRef.current?.setSelectionRange(0, emailFieldRef.current.value.length);
  }

  // Synchronous handler — runs inside the click event's user-gesture frame.
  function copyDraft() {
    // Primary path: synchronous execCommand.
    if (execCopy(draft)) {
      setCopiedItem("draft");
      setTimeout(() => setCopiedItem(null), 1500);
      return;
    }

    // Secondary path: async clipboard API.
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(draft)
        .then(() => {
          setCopiedItem("draft");
          setTimeout(() => setCopiedItem(null), 1500);
        })
        .catch(() => {
          setShowDraftFallback(true);
        });
      return;
    }

    // Last resort: show the modal with the draft pre-selected.
    setShowDraftFallback(true);
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
                fallbackTextareaRef.current?.setSelectionRange(
                  0,
                  fallbackTextareaRef.current.value.length,
                );
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
