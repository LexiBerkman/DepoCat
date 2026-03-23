"use client";

import { format } from "date-fns";
import type { CommunicationType } from "@prisma/client";
import { useMemo, useState } from "react";

import { CounselActions } from "@/components/counsel-actions";
import { LogEmailForm } from "@/components/log-email-form";
import { ScheduledDateForm } from "@/components/scheduled-date-form";
import { type EmailTemplateKey } from "@/lib/email-templates";

function formatDate(value: Date | null) {
  return value ? format(value, "MMM d, yyyy") : "Not set";
}

function toDate(value: string | Date | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Reject bogus Excel zero-dates (1899-12-30, serial 0) stored in the DB. */
function isValidScheduledDate(date: Date | null): boolean {
  if (!date) return false;
  return new Date(date).getFullYear() >= 1900;
}

function getFollowUpLabel(stage: string) {
  switch (stage) {
    case "FIRST_EMAIL_PENDING":
      return { label: "Schedule", className: "pill-neutral" };
    case "SECOND_EMAIL_PENDING":
      return { label: "2nd email due", className: "pill-warning" };
    case "FINAL_NOTICE_PENDING":
      return { label: "Final email due", className: "pill-danger" };
    case "SCHEDULED":
      return { label: "Scheduled", className: "pill-success" };
    default:
      return { label: "Awaiting reply", className: "pill-neutral" };
  }
}

/**
 * Determine which draft template to use based solely on the last logged
 * communication type — not the follow-up stage.  This keeps the logic
 * deterministic and independent of any stage drift.
 */
function getDraftTemplate(lastCommunicationType?: CommunicationType): EmailTemplateKey {
  if (lastCommunicationType === "FIRST_REQUEST") return "SECOND";
  if (lastCommunicationType === "SECOND_REQUEST" || lastCommunicationType === "FINAL_NOTICE") return "FINAL";
  return "FIRST";
}

export function DepositionRow({
  referenceNumber,
  clientName,
  depositionTargetId,
  deponentName,
  roleTitle,
  scheduledDate,
  followUpStage,
  followUpDueDate,
  lastCommunication,
  counselEmails,
  counselSummary,
}: {
  referenceNumber: string;
  clientName: string;
  depositionTargetId: string;
  deponentName: string;
  roleTitle: string | null;
  scheduledDate: Date | string | null;
  followUpStage: string;
  followUpDueDate: Date | string | null;
  lastCommunication:
    | {
        sentAt: Date | string;
        communicationType: CommunicationType;
      }
    | undefined;
  counselEmails: string[];
  counselSummary: string;
}) {
  const normalizedScheduledDate = toDate(scheduledDate);
  const normalizedLastSentAt = toDate(lastCommunication?.sentAt);
  const [currentFollowUpStage, setCurrentFollowUpStage] = useState(followUpStage);
  const [currentFollowUpDueDate, setCurrentFollowUpDueDate] = useState(toDate(followUpDueDate));

  const followUp = useMemo(() => getFollowUpLabel(currentFollowUpStage), [currentFollowUpStage]);
  const lastSentDateLabel = normalizedLastSentAt ? format(normalizedLastSentAt, "MMMM d, yyyy") : null;

  // A deposition is only truly scheduled if the stored date is a real date
  // (not an Excel zero-date artifact).
  const isScheduled = isValidScheduledDate(normalizedScheduledDate) || currentFollowUpStage === "SCHEDULED";

  return (
    <tr>
      <td>
        <strong>{referenceNumber}</strong>
      </td>
      <td>{clientName}</td>
      <td>
        <div>{deponentName}</div>
        <div className="muted small">{roleTitle || "No role noted"}</div>
      </td>
      <td>
        <ScheduledDateForm
          depositionTargetId={depositionTargetId}
          scheduledDate={normalizedScheduledDate}
          onUpdated={({ followUpStage: nextStage, followUpDueDateValue }) => {
            setCurrentFollowUpStage(nextStage);
            setCurrentFollowUpDueDate(followUpDueDateValue ? new Date(followUpDueDateValue) : null);
          }}
        />
      </td>
      <td>
        <div className={`pill ${followUp.className}`}>{followUp.label}</div>
        <div className="muted small">Due {formatDate(currentFollowUpDueDate)}</div>
        <LogEmailForm
          depositionTargetId={depositionTargetId}
          defaultType={
            currentFollowUpStage === "SECOND_EMAIL_PENDING"
              ? "FIRST_REQUEST"
              : currentFollowUpStage === "FINAL_NOTICE_PENDING"
                ? "SECOND_REQUEST"
                : "FINAL_NOTICE"
          }
        />
      </td>
      <td>
        <div className="small">
          {normalizedLastSentAt ? format(normalizedLastSentAt, "MMM d, yyyy h:mm a") : "Not logged"}
        </div>
        <div className="muted small">
          {lastCommunication
            ? lastCommunication.communicationType === "FIRST_REQUEST"
              ? "1st email"
              : lastCommunication.communicationType === "SECOND_REQUEST"
                ? "2nd email"
                : "Final email"
            : "No communication logged"}
        </div>
      </td>
      <td>
        <div className="stack">
          <CounselActions
            emails={counselEmails}
            deponentName={deponentName}
            clientName={clientName}
            referenceNumber={referenceNumber}
            draftTemplate={getDraftTemplate(lastCommunication?.communicationType)}
            lastSentDateLabel={lastSentDateLabel}
            isScheduled={isScheduled}
          />
          <div className="small muted">{counselSummary}</div>
        </div>
      </td>
    </tr>
  );
}
