import { Cat, PawPrint } from "lucide-react";
import type { CommunicationType } from "@prisma/client";

import { DepositionRow } from "@/components/deposition-row";

type TrackerMatter = {
  id: string;
  referenceNumber: string;
  clientName: string;
  depositions: Array<{
    id: string;
    fullName: string;
    roleTitle: string | null;
    scheduledDate: Date | null;
    followUpStage: string;
    followUpDueDate: Date | null;
    communications: Array<{
      sentAt: Date;
      communicationType: CommunicationType;
    }>;
  }>;
  opposingCounsel: Array<{
    fullName: string;
    firmName: string | null;
    email: string;
  }>;
};

export function DepositionTracker({ matters }: { matters: TrackerMatter[] }) {
  return (
    <section className="table-shell">
      <div className="row">
        <div>
          <h2 className="section-title">Deposition tracker</h2>
          <p className="muted">Every matter, deponent, deadline, and contact path in one place.</p>
        </div>
        <div className="tracker-tag">
          <Cat size={15} />
          <PawPrint size={14} />
          Herd the cats
        </div>
      </div>
      <div className="table-scroll">
        <table className="tracker-table">
          <colgroup>
            <col className="col-reference" />
            <col className="col-client" />
            <col className="col-deponent" />
            <col className="col-scheduled" />
            <col className="col-next" />
            <col className="col-last-email" />
            <col className="col-counsel" />
          </colgroup>
          <thead>
            <tr>
              <th>Reference</th>
              <th>Client</th>
              <th>Deponent</th>
              <th>Scheduled</th>
              <th>Next step</th>
              <th>Last email</th>
              <th>Opposing counsel</th>
            </tr>
          </thead>
          <tbody>
            {matters.flatMap((matter) =>
              matter.depositions.map((deposition) => {
                const lastCommunication = deposition.communications[0];

                return (
                  <DepositionRow
                    key={deposition.id}
                    referenceNumber={matter.referenceNumber}
                    clientName={matter.clientName}
                    matterId={matter.id}
                    depositionTargetId={deposition.id}
                    deponentName={deposition.fullName}
                    roleTitle={deposition.roleTitle}
                    scheduledDate={deposition.scheduledDate}
                    followUpStage={deposition.followUpStage}
                    followUpDueDate={deposition.followUpDueDate}
                    lastCommunication={
                      lastCommunication
                        ? {
                            sentAt: lastCommunication.sentAt,
                            communicationType: lastCommunication.communicationType,
                          }
                        : undefined
                    }
                    counselEmails={matter.opposingCounsel.map((counsel) => counsel.email)}
                    counselSummary={matter.opposingCounsel
                      .map((counsel) =>
                        `${counsel.fullName}${counsel.firmName ? `, ${counsel.firmName}` : ""}`,
                      )
                      .join(" | ")}
                  />
                );
              }),
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
