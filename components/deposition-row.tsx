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

function getFollowUpLabel(stage: string) {
  switch (stage) {
    case "FIRST_EMAIL_PENDING":
      return { label: "1st email", className: "pill-neutral" };
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

function getDraftEmailTemplate(stage: string, lastCommunicationType?: CommunicationType): EmailTemplateKey {
  if (!lastCommunicationType) {
    if (stage === "SECOND_EMAIL_PENDING") {
      return "SECOND";
    }

    if (stage === "FINAL_NOTICE_PENDING") {
      return "FINAL";
    }

    return "FIRST";
  }

  if (lastCommunicationType === "FIRST_REQUEST") {
    return "SECOND";
  }

  if (lastCommunicationType === "SECOND_REQUEST" || lastCommunicationType === "FINAL_NOTICE") {
    return "FINAL";
  }

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
  scheduledDate: Date | null;
  followUpStage: string;
  followUpDueDate: Date | null;
  lastCommunication:
    | {
        sentAt: Date;
        communicationType: CommunicationType;
      }
    | undefined;
  counselEmails: string[];
  counselSummary: string;
}) {
  const [currentFollowUpStage, setCurrentFollowUpStage] = useState(followUpStage);
  const [currentFollowUpDueDate, setCurrentFollowUpDueDate] = useState(followUpDueDate);

  const followUp = useMemo(() => getFollowUpLabel(currentFollowUpStage), [currentFollowUpStage]);
  const lastSentDateLabel = lastCommunication ? format(lastCommunication.sentAt, "MMMM d, yyyy") : null;

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
          scheduledDate={scheduledDate}
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
          {lastCommunication ? format(lastCommunication.sentAt, "MMM d, yyyy h:mm a") : "Not logged"}
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
            referenceNumber={referenceNumber}
            draftTemplate={getDraftEmailTemplate(currentFollowUpStage, lastCommunication?.communicationType)}
            lastSentDateLabel={lastSentDateLabel}
          />
          <div className="small muted">{counselSummary}</div>
        </div>
      </td>
    </tr>
  );
}
