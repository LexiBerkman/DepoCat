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

  async function copyEmails() {
    await navigator.clipboard.writeText(emails.join("; "));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  function openMail() {
    window.location.href = mailto;
  }

  return (
    <div className="row-wrap">
      <button className="link-chip" type="button" onClick={openMail}>
        <Mail size={16} />
        Open in Outlook
      </button>
      <button className="link-chip" type="button" onClick={copyEmails}>
        <Copy size={16} />
        {copied ? "Copied emails" : "Copy emails"}
      </button>
      <span className="link-chip">{emails.join("; ")}</span>
    </div>
  );
}
