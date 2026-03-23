"use client";

import { Mail, Copy } from "lucide-react";
import { useState } from "react";

export function CounselActions({
  mailto,
  emails,
}: {
  mailto: string;
  emails: string[];
}) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");

  async function copyWithFallback(value: string) {
    const textArea = document.createElement("textarea");
    textArea.value = value;
    textArea.setAttribute("readonly", "true");
    textArea.style.position = "absolute";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
  }

  async function copyEmails() {
    if (!emails.length) {
      setCopyError("No email addresses are saved for this matter yet.");
      return;
    }

    const emailList = emails.join("; ");

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(emailList);
      } else {
        await copyWithFallback(emailList);
      }

      setCopied(true);
      setCopyError("");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      try {
        await copyWithFallback(emailList);
        setCopied(true);
        setCopyError("");
        window.setTimeout(() => setCopied(false), 1500);
      } catch {
        setCopyError("Copy did not complete. Please highlight the emails and copy them manually.");
      }
    }
  }

  return (
    <div className="stack">
      <div className="row-wrap">
        <a
          className="link-chip"
          href={emails.length ? mailto : undefined}
          aria-disabled={emails.length === 0}
        >
          <Mail size={16} />
          Open in Outlook
        </a>
        <button className="link-chip" type="button" onClick={copyEmails} disabled={emails.length === 0}>
          <Copy size={16} />
          {copied ? "Copied emails" : "Copy emails"}
        </button>
      </div>
      <span className="link-chip counsel-email-list">{emails.length ? emails.join("; ") : "No counsel emails saved"}</span>
      {copyError ? <span className="error small">{copyError}</span> : null}
    </div>
  );
}
