"use client";

import { format } from "date-fns";
import type { CommunicationType } from "@prisma/client";
import { useMemo, useState } from "react";

import { CounselActions } from "@/components/counsel-actions";
import { CounselEmailEditor } from "@/components/counsel-email-editor";
import { DeleteDeponentButton } from "@/components/delete-deponent-button";
import { DepositionNoteField } from "@/components/deposition-note-field";
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
  notes,
  scheduledDate,
  followUpStage,
  followUpDueDate,
  lastCommunication,
  counselEmails,
  counselSummary,
  onCounselEmailsUpdated,
  variant = "table",
}: {
  referenceNumber: string;
  clientName: string;
  matterId: string;
  depositionTargetId: string;
  deponentName: string;
  roleTitle: string | null;
  notes: string | null;
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
  onCounselEmailsUpdated?: (emails: string[]) => void;
  variant?: "table" | "card";
}) {
  const [currentScheduledDate, setCurrentScheduledDate] = useState(toDate(scheduledDate));
  const [currentFollowUpStage, setCurrentFollowUpStage] = useState(followUpStage);
  const [currentFollowUpDueDate, setCurrentFollowUpDueDate] = useState(toDate(followUpDueDate));
  const [isDeleted, setIsDeleted] = useState(false);
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

  const scheduledContent = (
    <ScheduledDateForm
      depositionTargetId={depositionTargetId}
      scheduledDate={currentScheduledDate}
      onUpdated={({ scheduledDateValue, followUpStage: nextStage, followUpDueDateValue }) => {
        setCurrentScheduledDate(toDate(scheduledDateValue));
        setCurrentFollowUpStage(nextStage);
        setCurrentFollowUpDueDate(followUpDueDateValue ? new Date(followUpDueDateValue) : null);
      }}
    />
  );

  const nextStepContent = (
    <>
      <div className="next-step-summary">
        <div className={`pill ${followUp.className}`}>{followUp.label}</div>
        {currentFollowUpDueDate ? (
          <div className="muted small">Due {format(currentFollowUpDueDate, "MMM d, yyyy")}</div>
        ) : null}
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
    </>
  );

  const lastCommunicationContent = currentLastCommunication ? (
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
  );

  const topWorkflowContent = (
    <section className="tracker-mobile-section tracker-mobile-section-emphasis">
      <div className="tracker-mobile-topline">
        <div>
          <div className="tracker-mobile-label">Next step</div>
          <div className="next-step-summary tracker-mobile-top-summary">
            <div className={`pill ${followUp.className}`}>{followUp.label}</div>
            {currentFollowUpDueDate ? (
              <div className="muted small">Due {format(currentFollowUpDueDate, "MMM d, yyyy")}</div>
            ) : null}
          </div>
        </div>
        <div>
          <div className="tracker-mobile-label">Last email</div>
          <div className="tracker-mobile-last-email">{lastCommunicationContent}</div>
        </div>
      </div>
      <div className="next-step-cell tracker-mobile-next-step">{nextStepContent}</div>
    </section>
  );

  const counselContent = (
    <div className="stack">
      <CounselActions
        emails={counselEmails}
        deponentName={deponentName}
        clientName={clientName}
        referenceNumber={referenceNumber}
        draftTemplate={getDraftTemplate(currentLastCommunication?.communicationType)}
        lastSentDateLabel={lastSentDateLabel}
        isScheduled={isScheduled}
      />
      <CounselEmailEditor
        matterId={matterId}
        counselEmails={counselEmails}
        onUpdated={onCounselEmailsUpdated}
      />
      <div className="small muted">{counselSummary}</div>
      <DeleteDeponentButton
        depositionTargetId={depositionTargetId}
        deponentName={deponentName}
        onDeleted={() => setIsDeleted(true)}
      />
    </div>
  );

  if (variant === "card") {
    return (
      <article className="tracker-mobile-card">
        <div className="tracker-mobile-card-header">
          <div className="stack tracker-mobile-card-title">
            <div className="tracker-mobile-kicker">Reference matter</div>
            <h3>{referenceNumber}</h3>
          </div>
          <div className={`pill ${followUp.className}`}>{followUp.label}</div>
        </div>

        <div className="tracker-mobile-grid">
          {topWorkflowContent}

          <section className="tracker-mobile-section">
            <div className="tracker-mobile-summary-grid">
              <div className="tracker-mobile-summary-card">
                <div className="tracker-mobile-label">Client</div>
                <div className="tracker-mobile-value">{clientName}</div>
              </div>
              <div className="tracker-mobile-summary-card">
                <div className="tracker-mobile-label">Deponent</div>
                <div className="tracker-mobile-value">{deponentName}</div>
                <div className="muted small">{roleTitle || "No role noted"}</div>
              </div>
            </div>
          </section>

          <section className="tracker-mobile-section tracker-mobile-section-emphasis">
            <div className="tracker-mobile-label">Notes</div>
            <DepositionNoteField depositionTargetId={depositionTargetId} initialNotes={notes} />
          </section>

          <section className="tracker-mobile-section tracker-mobile-section-emphasis">
            <div className="tracker-mobile-label">Scheduled</div>
            {scheduledContent}
          </section>

          <section className="tracker-mobile-section tracker-mobile-section-emphasis">
            <div className="tracker-mobile-label">Opposing counsel</div>
            {counselContent}
          </section>
        </div>
      </article>
    );
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
        <DepositionNoteField depositionTargetId={depositionTargetId} initialNotes={notes} />
      </td>
      <td>{scheduledContent}</td>
      <td className="next-step-cell">{nextStepContent}</td>
      <td>{lastCommunicationContent}</td>
      <td>{counselContent}</td>
    </tr>
  );
}
