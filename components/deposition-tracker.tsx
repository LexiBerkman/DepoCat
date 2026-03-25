"use client";

import { useEffect, useMemo, useState } from "react";
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
    notes: string | null;
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

type SearchField = "reference" | "client" | "deponent";

export function DepositionTracker({ matters }: { matters: TrackerMatter[] }) {
  const [searchField, setSearchField] = useState<SearchField>("reference");
  const [searchQuery, setSearchQuery] = useState("");
  const [matterCounselEmails, setMatterCounselEmails] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(
      matters.map((matter) => [matter.id, matter.opposingCounsel.map((counsel) => counsel.email)]),
    ),
  );

  useEffect(() => {
    setMatterCounselEmails(
      Object.fromEntries(
        matters.map((matter) => [matter.id, matter.opposingCounsel.map((counsel) => counsel.email)]),
      ),
    );
  }, [matters]);

  const rows = useMemo(
    () =>
      matters.flatMap((matter) =>
        matter.depositions.map((deposition) => ({
          matter,
          deposition,
          lastCommunication: deposition.communications[0],
        })),
      ),
    [matters],
  );

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredRows = useMemo(() => {
    if (!normalizedQuery) {
      return rows;
    }

    return rows.filter(({ matter, deposition }) => {
      const value =
        searchField === "reference"
          ? matter.referenceNumber
          : searchField === "client"
            ? matter.clientName
            : deposition.fullName;

      return value.toLowerCase().includes(normalizedQuery);
    });
  }, [normalizedQuery, rows, searchField]);

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
      <div className="tracker-search-bar">
        <label className="label tracker-search-label">
          Search by
          <select
            className="field"
            value={searchField}
            onChange={(event) => setSearchField(event.target.value as SearchField)}
          >
            <option value="reference">Reference</option>
            <option value="client">Client</option>
            <option value="deponent">Deponent</option>
          </select>
        </label>
        <label className="label tracker-search-label tracker-search-input">
          Search
          <input
            className="field"
            type="text"
            placeholder={
              searchField === "reference"
                ? "Type a reference number"
                : searchField === "client"
                  ? "Type a client name"
                  : "Type a deponent name"
            }
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </label>
        <div className="tracker-search-meta muted small">
          {filteredRows.length} {filteredRows.length === 1 ? "match" : "matches"}
        </div>
      </div>
      <div className="tracker-records-list">
        {filteredRows.length > 0 ? (
          filteredRows.map(({ matter, deposition, lastCommunication }) => (
            <DepositionRow
              key={deposition.id}
              variant="card"
              referenceNumber={matter.referenceNumber}
              clientName={matter.clientName}
              matterId={matter.id}
              depositionTargetId={deposition.id}
              deponentName={deposition.fullName}
              roleTitle={deposition.roleTitle}
              notes={deposition.notes}
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
              counselEmails={matterCounselEmails[matter.id] ?? []}
              counselSummary={matter.opposingCounsel
                .map((counsel) =>
                  `${counsel.fullName}${counsel.firmName ? `, ${counsel.firmName}` : ""}`,
                )
                .join(" | ")}
              onCounselEmailsUpdated={(emails) => {
                setMatterCounselEmails((current) => ({
                  ...current,
                  [matter.id]: emails,
                }));
              }}
            />
          ))
        ) : (
          <div className="tracker-empty-state">
            No tracker rows matched that {searchField}. Try a different search.
          </div>
        )}
      </div>
    </section>
  );
}
