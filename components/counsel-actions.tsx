"use client";

import { Mail, Copy } from "lucide-react";
import { useRef, useState } from "react";

export function CounselActions({
  outlookUrl,
  emails,
}: {
  outlookUrl: string;
  emails: string[];
}) {
  const [copied, setCopied] = useState(false);
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

      setCopied(true);
      setCopyError("");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      const copiedToClipboard = copyWithFallback();

      if (copiedToClipboard) {
        setCopied(true);
        setCopyError("");
        window.setTimeout(() => setCopied(false), 1500);
      } else {
        setCopyError("Copy did not complete. Please highlight the emails and copy them manually.");
      }
    }
  }

  function openOutlook() {
    if (!emails.length) {
      return;
    }

    window.open(outlookUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="stack">
      <div className="row-wrap">
        <button className="link-chip" type="button" onClick={openOutlook} disabled={emails.length === 0}>
          <Mail size={16} />
          Open in Outlook
        </button>
        <button className="link-chip" type="button" onClick={copyEmails} disabled={emails.length === 0}>
          <Copy size={16} />
          {copied ? "Copied emails" : "Copy emails"}
        </button>
      </div>
      <input
        ref={emailFieldRef}
        className="field counsel-email-field"
        type="text"
        value={emails.length ? emails.join("; ") : "No counsel emails saved"}
        readOnly
        onFocus={selectEmails}
      />
      {copyError ? <span className="error small">{copyError}</span> : null}
    </div>
  );
}
