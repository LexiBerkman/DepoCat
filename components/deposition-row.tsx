"use client";

import { format } from "date-fns";
import type { CommunicationType } from "@prisma/client";
import { useMemo, useState } from "react";

import { CounselActions } from "@/components/counsel-actions";
import { CounselEmailEditor } from "@/components/counsel-email-editor";
import { DeleteDeponentButton } from "@/components/delete-deponent-button";
import { LogEmailForm } from "@/components/log-email-form";
import { ScheduledDateForm } from "@/components/scheduled-date-form";
import {
  getDefaultCommunicationType,
  getDraftTemplate,
  getFollowUpLabel,
  isValidScheduledDate,
  toDate,
} from "@/lib/deposition-workflow";

export function DepositionRow({
  referenceNumber,
  clientName,
  matterId,
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
  matterId: string;
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
  const [currentScheduledDate, setCurrentScheduledDate] = useState(toDate(scheduledDate));
  const [currentFollowUpStage, setCurrentFollowUpStage] = useState(followUpStage);
  const [currentFollowUpDueDate, setCurrentFollowUpDueDate] = useState(toDate(followUpDueDate));
  const [isDeleted, setIsDeleted] = useState(false);
  const [currentCounselEmails, setCurrentCounselEmails] = useState(counselEmails);
  const [currentLastCommunication, setCurrentLastCommunication] = useState(lastCommunication);

  const followUp = useMemo(() => getFollowUpLabel(currentFollowUpStage), [currentFollowUpStage]);
  const currentLastSentAt = toDate(currentLastCommunication?.sentAt);
  const lastSentDateLabel = currentLastSentAt ? format(currentLastSentAt, "MMMM d, yyyy") : null;

  // A deposition is only truly scheduled if the stored date is a real date
  // (not an Excel zero-date artifact).
  const isScheduled = isValidScheduledDate(currentScheduledDate) || currentFollowUpStage === "SCHEDULED";

  if (isDeleted) {
    return null;
  }

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
          scheduledDate={currentScheduledDate}
          onUpdated={({ scheduledDateValue, followUpStage: nextStage, followUpDueDateValue }) => {
            setCurrentScheduledDate(toDate(scheduledDateValue));
            setCurrentFollowUpStage(nextStage);
            setCurrentFollowUpDueDate(followUpDueDateValue ? new Date(followUpDueDateValue) : null);
          }}
        />
      </td>
      <td className="next-step-cell">
        <div className="next-step-summary">
          <div className={`pill ${followUp.className}`}>{followUp.label}</div>
        </div>
        <LogEmailForm
          depositionTargetId={depositionTargetId}
          defaultType={getDefaultCommunicationType(currentFollowUpStage)}
          onLogged={({ communicationType, sentAt, followUpStage: nextStage, followUpDueDateValue }) => {
            setCurrentLastCommunication({
              communicationType,
              sentAt,
            });
            setCurrentFollowUpStage(nextStage);
            setCurrentFollowUpDueDate(followUpDueDateValue ? new Date(followUpDueDateValue) : null);
          }}
        />
      </td>
      <td>
        {currentLastCommunication ? (
          <>
            <div className="small">{format(currentLastSentAt!, "MMM d, yyyy h:mm a")}</div>
            <div className="muted small">
              {currentLastCommunication.communicationType === "FIRST_REQUEST"
                ? "1st email"
                : currentLastCommunication.communicationType === "SECOND_REQUEST"
                  ? "2nd email"
                  : "Final email"}
            </div>
          </>
        ) : (
          <div className="muted small">No communication logged</div>
        )}
      </td>
      <td>
        <div className="stack">
          <CounselActions
            emails={currentCounselEmails}
            deponentName={deponentName}
            clientName={clientName}
            referenceNumber={referenceNumber}
            draftTemplate={getDraftTemplate(currentLastCommunication?.communicationType)}
            lastSentDateLabel={lastSentDateLabel}
            isScheduled={isScheduled}
          />
          <CounselEmailEditor
            matterId={matterId}
            counselEmails={currentCounselEmails}
            onUpdated={setCurrentCounselEmails}
          />
          <div className="small muted">{counselSummary}</div>
          <DeleteDeponentButton
            depositionTargetId={depositionTargetId}
            deponentName={deponentName}
            onDeleted={() => setIsDeleted(true)}
          />
        </div>
      </td>
    </tr>
  );
}
