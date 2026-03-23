"use client";

import { Copy } from "lucide-react";
import { useState } from "react";

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

    try {
      const copiedToClipboard = await copyText(emailList);

      if (!copiedToClipboard) {
        throw new Error("Copy failed");
      }

      setCopyError("");
      setCopiedItem("emails");
      window.setTimeout(() => setCopiedItem(null), 1500);
    } catch {
      const copiedToClipboard = copyTextWithFallback(emailList);

      if (copiedToClipboard) {
        setCopyError("");
        setCopiedItem("emails");
        window.setTimeout(() => setCopiedItem(null), 1500);
      } else {
        setCopyError("Copy did not complete. Please highlight the emails and copy them manually.");
      }
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
      setCopiedItem("draft");
      window.setTimeout(() => setCopiedItem(null), 1500);
    } catch {
      const copiedToClipboard = copyTextWithFallback(draft);

      if (copiedToClipboard) {
        setCopyError("");
        setCopiedItem("draft");
        window.setTimeout(() => setCopiedItem(null), 1500);
      } else {
        setCopyError("Draft copy did not complete. Please try again.");
      }
    }
  }

  return (
    <div className="stack">
      <button className="link-chip" type="button" onClick={copyEmails} disabled={emails.length === 0}>
        <Copy size={16} />
        {copiedItem === "emails" ? "Copied emails" : "Copy emails"}
      </button>
      <input
        className="field counsel-email-field"
        type="text"
        value={emails.length ? emails.join("; ") : "No counsel emails saved"}
        readOnly
      />
      <button className="button-secondary small-button" type="button" onClick={copyDraft}>
        {copiedItem === "draft" ? "Copied draft" : "Draft email"}
      </button>
      {copyError ? <span className="error small">{copyError}</span> : null}
    </div>
  );
}
