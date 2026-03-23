import { format } from "date-fns";
import { CalendarClock, Cat, PawPrint, ShieldCheck } from "lucide-react";

import { CounselActions } from "@/components/counsel-actions";
import { ImportForm } from "@/components/import-form";
import { LogEmailForm } from "@/components/log-email-form";
import { MatterForm } from "@/components/matter-form";
import { ScheduledDateForm } from "@/components/scheduled-date-form";
import { TopNav } from "@/components/top-nav";
import { requireSession } from "@/lib/auth";
import { type EmailTemplateKey } from "@/lib/email-templates";
import { prisma } from "@/lib/prisma";
import { securityChecklist } from "@/lib/security";

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

function getDefaultEmailTemplate(stage: string): EmailTemplateKey {
  switch (stage) {
    case "SECOND_EMAIL_PENDING":
      return "SECOND";
    case "FINAL_NOTICE_PENDING":
    case "AWAITING_RESPONSE":
      return "FINAL";
    default:
      return "FIRST";
  }
}

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
              Built for the practical work of herding schedules, dates, and counsel cats.
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
            <div className="security-grid">
              {securityChecklist.map((item) => (
                <div key={item} className="stat-card">
                  <div className="row">
                    <ShieldCheck size={18} />
                    <span className="small">{item}</span>
                  </div>
                </div>
              ))}
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
                const counselEmails = matter.opposingCounsel.map((counsel) => counsel.email);
                const followUp = getFollowUpLabel(deposition.followUpStage);
                const lastCommunication = deposition.communications[0];

                return (
                  <tr key={deposition.id}>
                    <td>
                      <strong>{matter.referenceNumber}</strong>
                    </td>
                    <td>{matter.clientName}</td>
                    <td>
                      <div>{deposition.fullName}</div>
                      <div className="muted small">{deposition.roleTitle || "No role noted"}</div>
                    </td>
                    <td>
                      <ScheduledDateForm
                        depositionTargetId={deposition.id}
                        scheduledDate={deposition.scheduledDate}
                      />
                    </td>
                    <td>
                      <div className={`pill ${followUp.className}`}>{followUp.label}</div>
                      <div className="muted small">Due {formatDate(deposition.followUpDueDate)}</div>
                      <LogEmailForm
                        depositionTargetId={deposition.id}
                        defaultType={
                          deposition.followUpStage === "SECOND_EMAIL_PENDING"
                            ? "FIRST_REQUEST"
                            : deposition.followUpStage === "FINAL_NOTICE_PENDING"
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
                          deponentName={deposition.fullName}
                          referenceNumber={matter.referenceNumber}
                          defaultTemplate={getDefaultEmailTemplate(deposition.followUpStage)}
                        />
                        <div className="small muted">
                          {matter.opposingCounsel
                            .map((counsel) => `${counsel.fullName}${counsel.firmName ? `, ${counsel.firmName}` : ""}`)
                            .join(" | ")}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              }),
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
