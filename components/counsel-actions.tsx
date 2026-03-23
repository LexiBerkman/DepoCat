"use client";

import { Copy } from "lucide-react";
import { useRef, useState } from "react";

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
  const emailFieldRef = useRef<HTMLInputElement>(null);

  function selectEmails() {
    emailFieldRef.current?.focus();
    emailFieldRef.current?.select();
    emailFieldRef.current?.setSelectionRange(0, emailFieldRef.current.value.length);
  }

  function copyWithFallback() {
    selectEmails();
    return document.execCommand("copy");
  }

  async function copyEmails() {
    if (!emails.length) {
      setCopyError("No email addresses are saved for this matter yet.");
      return;
    }

    const emailList = emails.join("; ");

    try {
      selectEmails();

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(emailList);
      } else {
        const copiedToClipboard = copyWithFallback();

        if (!copiedToClipboard) {
          throw new Error("Copy failed");
        }
      }

      setCopyError("");
      setCopiedItem("emails");
      window.setTimeout(() => setCopiedItem(null), 1500);
    } catch {
      const copiedToClipboard = copyWithFallback();

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
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(draft);
      } else {
        throw new Error("Clipboard API unavailable");
      }

      setCopyError("");
      setCopiedItem("draft");
      window.setTimeout(() => setCopiedItem(null), 1500);
    } catch {
      setCopyError("Draft copy did not complete. Please try again.");
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
        onFocus={selectEmails}
      />
      <button className="button-secondary small-button" type="button" onClick={copyDraft}>
        {copiedItem === "draft" ? "Copied draft" : "Draft email"}
      </button>
      {copyError ? <span className="error small">{copyError}</span> : null}
    </div>
  );
}
