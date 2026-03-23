"use client";

import { Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { buildEmailDraft, type EmailTemplateKey } from "@/lib/email-templates";

export function CounselActions({
  emails,
  deponentName,
  referenceNumber,
  draftTemplate,
  lastSentDateLabel,
}: {
  emails: string[];
  deponentName: string;
  referenceNumber: string;
  draftTemplate: EmailTemplateKey;
  lastSentDateLabel?: string | null;
}) {
  const [copiedItem, setCopiedItem] = useState<"emails" | "draft" | null>(null);
  const [copyError, setCopyError] = useState("");
  const [assistLabel, setAssistLabel] = useState("");
  const [assistText, setAssistText] = useState("");
  const emailFieldRef = useRef<HTMLInputElement>(null);
  const assistFieldRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!assistText) {
      return;
    }

    requestAnimationFrame(() => {
      assistFieldRef.current?.focus();
      assistFieldRef.current?.select();
      assistFieldRef.current?.setSelectionRange(0, assistFieldRef.current.value.length);
    });
  }, [assistText]);

  function copyTextWithFallback(value: string) {
    const textArea = document.createElement("textarea");
    textArea.value = value;
    textArea.setAttribute("readonly", "true");
    textArea.style.position = "absolute";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, textArea.value.length);
    const copied = document.execCommand("copy");
    document.body.removeChild(textArea);
    return copied;
  }

  async function copyText(value: string) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }

    return copyTextWithFallback(value);
  }

  async function copyEmails() {
    if (!emails.length) {
      setCopyError("No email addresses are saved for this matter yet.");
      return;
    }

    const emailList = emails.join("; ");
    emailFieldRef.current?.focus();
    emailFieldRef.current?.select();
    emailFieldRef.current?.setSelectionRange(0, emailFieldRef.current.value.length);

    try {
      const copiedToClipboard = await copyText(emailList);

      if (!copiedToClipboard) {
        throw new Error("Copy failed");
      }

      setCopyError("");
      setAssistLabel("");
      setAssistText("");
      setCopiedItem("emails");
      window.setTimeout(() => setCopiedItem(null), 1500);
    } catch {
      setCopiedItem(null);
      setCopyError("Copy did not complete automatically. The emails are selected below and ready to copy.");
      setAssistLabel("Emails ready to copy");
      setAssistText(emailList);
    }
  }

  async function copyDraft() {
    const draft = buildEmailDraft({
      template: draftTemplate,
      deponentName,
      referenceNumber,
      lastSentDateLabel,
    });

    try {
      const copiedToClipboard = await copyText(draft);

      if (!copiedToClipboard) {
        throw new Error("Copy failed");
      }

      setCopyError("");
      setAssistLabel("");
      setAssistText("");
      setCopiedItem("draft");
      window.setTimeout(() => setCopiedItem(null), 1500);
    } catch {
      setCopiedItem(null);
      setCopyError("Draft copy did not complete automatically. The draft is ready below for Ctrl/Cmd+C.");
      setAssistLabel("Draft ready to copy");
      setAssistText(draft);
    }
  }

  return (
    <div className="stack">
      <button className="link-chip" type="button" onClick={copyEmails} disabled={emails.length === 0}>
        <Copy size={16} />
        {copiedItem === "emails" ? "Copied emails" : "Copy emails"}
      </button>
      <input
        ref={emailFieldRef}
        className="field counsel-email-field"
        type="text"
        value={emails.length ? emails.join("; ") : "No counsel emails saved"}
        readOnly
      />
      <button className="button-secondary small-button" type="button" onClick={copyDraft}>
        {copiedItem === "draft" ? "Copied draft" : "Draft email"}
      </button>
      {assistText ? (
        <label className="label">
          {assistLabel}
          <textarea
            ref={assistFieldRef}
            className="field counsel-assist-field"
            value={assistText}
            readOnly
            rows={assistLabel === "Emails ready to copy" ? 2 : 8}
          />
        </label>
      ) : null}
      {copyError ? <span className="error small">{copyError}</span> : null}
    </div>
  );
}
