"use client";

import { Copy } from "lucide-react";
import { useRef, useState } from "react";

import { buildEmailDraft, type EmailTemplateKey } from "@/lib/email-templates";

export function CounselActions({
  emails,
  deponentName,
  referenceNumber,
  defaultTemplate,
}: {
  emails: string[];
  deponentName: string;
  referenceNumber: string;
  defaultTemplate: EmailTemplateKey;
}) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplateKey>(defaultTemplate);
  const emailFieldRef = useRef<HTMLInputElement>(null);
  const draftFieldRef = useRef<HTMLTextAreaElement>(null);

  function selectEmails() {
    emailFieldRef.current?.focus();
    emailFieldRef.current?.select();
    emailFieldRef.current?.setSelectionRange(0, emailFieldRef.current.value.length);
  }

  function copyWithFallback() {
    selectEmails();
    return document.execCommand("copy");
  }

  function selectDraft() {
    draftFieldRef.current?.focus();
    draftFieldRef.current?.select();
    draftFieldRef.current?.setSelectionRange(0, draftFieldRef.current.value.length);
  }

  function copyDraftWithFallback() {
    selectDraft();
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

  async function copyDraft(template: EmailTemplateKey) {
    const draft = buildEmailDraft({
      template,
      deponentName,
      referenceNumber,
    });

    setSelectedTemplate(template);

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(draft);
      } else {
        const copiedToClipboard = copyDraftWithFallback();

        if (!copiedToClipboard) {
          throw new Error("Copy failed");
        }
      }

      setCopied(true);
      setCopyError("");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      const copiedToClipboard = copyDraftWithFallback();

      if (copiedToClipboard) {
        setCopied(true);
        setCopyError("");
        window.setTimeout(() => setCopied(false), 1500);
      } else {
        setCopyError("Copy did not complete. Please highlight the draft and copy it manually.");
      }
    }
  }

  const selectedDraft = buildEmailDraft({
    template: selectedTemplate,
    deponentName,
    referenceNumber,
  });

  return (
    <div className="stack">
      <button className="link-chip" type="button" onClick={copyEmails} disabled={emails.length === 0}>
        <Copy size={16} />
        {copied ? "Copied" : "Copy emails"}
      </button>
      <input
        ref={emailFieldRef}
        className="field counsel-email-field"
        type="text"
        value={emails.length ? emails.join("; ") : "No counsel emails saved"}
        readOnly
        onFocus={selectEmails}
      />
      <div className="row-wrap">
        <button className="button-secondary small-button" type="button" onClick={() => copyDraft("FIRST")}>
          Copy 1st email
        </button>
        <button className="button-secondary small-button" type="button" onClick={() => copyDraft("SECOND")}>
          Copy 2nd email
        </button>
        <button className="button-secondary small-button" type="button" onClick={() => copyDraft("FINAL")}>
          Copy final email
        </button>
      </div>
      <textarea
        ref={draftFieldRef}
        className="field counsel-draft-field"
        value={selectedDraft}
        readOnly
        rows={9}
        onFocus={selectDraft}
      />
      {copyError ? <span className="error small">{copyError}</span> : null}
    </div>
  );
}
