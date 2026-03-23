import { format } from "date-fns";
import { CalendarClock, Cat, PawPrint } from "lucide-react";

import { DepositionRow } from "@/components/deposition-row";
import { ImportForm } from "@/components/import-form";
import { MatterForm } from "@/components/matter-form";
import { TopNav } from "@/components/top-nav";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function HomePage() {
  const session = await requireSession();

  const matters = await prisma.matter.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      depositions: {
        orderBy: { updatedAt: "desc" },
        include: {
          communications: {
            orderBy: { sentAt: "desc" },
            take: 1,
          },
        },
      },
      opposingCounsel: {
        orderBy: { fullName: "asc" },
      },
    },
  });

  const stats = {
    matters: matters.length,
    deponents: matters.reduce((total, matter) => total + matter.depositions.length, 0),
    scheduled: matters.reduce(
      (total, matter) =>
        total + matter.depositions.filter((deposition) => deposition.status === "SCHEDULED").length,
      0,
    ),
  };

  return (
    <main className="shell">
      <TopNav currentPath="/" fullName={session.fullName} role={session.role} />
      <section className="hero-card">
        <div className="hero-grid">
          <div className="stack">
            <span className="badge">
              <Cat size={16} />
              Practical. Playful. Locked down.
            </span>
            <h1 className="hero-title">DepoCat</h1>
            <p className="hero-subtitle">
              Track your matters by reference number, keep every deponent and opposing counsel at
              your fingertips, and move each deposition through the request-follow-up-schedule flow.
            </p>
            <div className="cat-note">
              <PawPrint size={16} />
              Built for the practical work of herding cats.
            </div>
            <div className="row-wrap">
              <a className="button" href="#matter-form">
                Add a matter
              </a>
              <a className="button-secondary" href="#import-panel">
                Import Excel
              </a>
            </div>
          </div>
          <div className="panel stack">
            <div className="row">
              <strong>Workflow pulse</strong>
              <CalendarClock size={18} />
            </div>
            <p className="muted">
              First email, wait 3 days. Second email, wait 3 days. Final email if still silent.
              DepoCat surfaces the next action so you and your paralegal can keep momentum.
            </p>
            <div className="mini-callout">
              <Cat size={16} />
              No missed follow-ups. No feral spreadsheets.
            </div>
          </div>
        </div>

        <div className="stats-grid">
          <article className="stat-card">
            <div className="muted small">Active matters</div>
            <h2>{stats.matters}</h2>
          </article>
          <article className="stat-card">
            <div className="muted small">Deponents tracked</div>
            <h2>{stats.deponents}</h2>
          </article>
          <article className="stat-card">
            <div className="muted small">Depositions scheduled</div>
            <h2>{stats.scheduled}</h2>
          </article>
        </div>
      </section>

      <section className="content-grid">
        <div id="matter-form" className="panel stack">
          <div>
            <h2 className="section-title">Quick intake</h2>
            <p className="muted">
              Add a matter manually when a new file opens or a new deponent needs to be pursued.
            </p>
          </div>
          <MatterForm />
        </div>

        <div id="import-panel" className="panel stack">
          <div>
            <h2 className="section-title">Spreadsheet import</h2>
            <p className="muted">
              Drop in an Excel workbook and DepoCat will update existing matters or create new ones.
            </p>
          </div>
          <ImportForm />
        </div>
      </section>

      <section className="table-shell">
        <div className="row">
          <div>
            <h2 className="section-title">Deposition tracker</h2>
            <p className="muted">Every matter, deponent, deadline, and contact path in one place.</p>
          </div>
        <div className="tracker-tag">
          <PawPrint size={16} />
          Herd the cats
        </div>
        </div>
        <div className="table-scroll">
          <table>
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
                        .map((counsel) => `${counsel.fullName}${counsel.firmName ? `, ${counsel.firmName}` : ""}`)
                        .join(" | ")}
                    />
                  );
                }),
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
