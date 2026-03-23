import { format } from "date-fns";
import { CalendarClock, Cat, ShieldCheck } from "lucide-react";

import { ChangePasswordForm } from "@/components/change-password-form";
import { CounselActions } from "@/components/counsel-actions";
import { ImportForm } from "@/components/import-form";
import { LogEmailForm } from "@/components/log-email-form";
import { LogoutButton } from "@/components/logout-button";
import { MatterForm } from "@/components/matter-form";
import { OwnerResetPasswordForm } from "@/components/owner-reset-password-form";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { securityChecklist } from "@/lib/security";
import { buildMailto } from "@/lib/utils";

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

export default async function HomePage() {
  const session = await requireSession();

  const [matters, users, recentAudit] = await Promise.all([
    prisma.matter.findMany({
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
    }),
    session.role === "OWNER"
      ? prisma.user.findMany({
          where: { status: "ACTIVE" },
          orderBy: [{ role: "asc" }, { fullName: "asc" }],
        })
      : Promise.resolve([]),
    session.role === "OWNER"
      ? prisma.auditLog.findMany({
          orderBy: { createdAt: "desc" },
          take: 8,
          include: { user: true },
        })
      : Promise.resolve([]),
  ]);

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
            <div className="row-wrap">
              <span className="link-chip">Signed in as {session.fullName}</span>
              <span className="link-chip">{session.role === "OWNER" ? "Owner" : "Paralegal"}</span>
            </div>
            <div className="row-wrap">
              <a className="button" href="#matter-form">
                Add a matter
              </a>
              <a className="button-secondary" href="#import-panel">
                Import Excel
              </a>
              <LogoutButton />
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

      <section className="content-grid">
        <div className="panel stack">
          <div>
            <h2 className="section-title">Account security</h2>
            <p className="muted">
              Replace the temporary password with a private one you keep in your password manager.
            </p>
          </div>
          <div className="stat-card stack">
            <div className="small muted">Current sign-in</div>
            <strong>{session.email}</strong>
            <div className="muted small">
              {session.role === "OWNER" ? "Owner access" : "Paralegal access"}
            </div>
          </div>
          <ChangePasswordForm />
        </div>

        <div className="panel stack">
          <div>
            <h2 className="section-title">Security habits</h2>
            <p className="muted">
              A few practical steps will make this much safer for daily legal work.
            </p>
          </div>
          <div className="stack">
            <div className="stat-card">
              <strong>Use unique passwords</strong>
              <div className="muted small">
                Give each DepoCat user a separate password that is not reused anywhere else.
              </div>
            </div>
            <div className="stat-card">
              <strong>Sign out shared devices</strong>
              <div className="muted small">
                Changing a password will revoke the other active sessions for that user.
              </div>
            </div>
            <div className="stat-card">
              <strong>Next security step</strong>
              <div className="muted small">
                We should add MFA next if this is becoming part of real daily case work.
              </div>
            </div>
          </div>
        </div>
      </section>

      {session.role === "OWNER" ? (
        <section className="content-grid">
          <div className="panel stack">
            <div>
              <h2 className="section-title">Authorized team</h2>
              <p className="muted">
                These are the active online logins currently configured for DepoCat.
              </p>
            </div>
            <div className="stack">
              {users.map((user) => (
                <div key={user.id} className="stat-card">
                  <div className="row">
                    <strong>{user.fullName}</strong>
                    <span className={`pill ${user.role === "OWNER" ? "pill-danger" : "pill-neutral"}`}>
                      {user.role === "OWNER" ? "Owner" : "Paralegal"}
                    </span>
                  </div>
                  <div className="muted small">{user.email}</div>
                  <div className="muted small">
                    Last login {user.lastLoginAt ? format(user.lastLoginAt, "MMM d, yyyy h:mm a") : "Not yet"}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel stack">
            <div>
              <h2 className="section-title">Recent security activity</h2>
              <p className="muted">
                A lightweight audit trail for sign-ins, imports, and matter changes.
              </p>
            </div>
            <div className="stack">
              {recentAudit.map((event) => (
                <div key={event.id} className="stat-card">
                  <div className="row">
                    <strong>{event.action}</strong>
                    <span className="muted small">{format(event.createdAt, "MMM d, h:mm a")}</span>
                  </div>
                  <div className="muted small">
                    {event.user?.fullName ?? "System"} · {event.entityType}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel stack">
            <div>
              <h2 className="section-title">Owner password reset</h2>
              <p className="muted">
                Generate a temporary password for a user who cannot get back in.
              </p>
            </div>
            <OwnerResetPasswordForm
              users={users.map((user) => ({
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
              }))}
            />
          </div>
        </section>
      ) : null}

      <section className="table-shell">
        <div className="row">
          <div>
            <h2 className="section-title">Deposition tracker</h2>
            <p className="muted">Every matter, deponent, deadline, and contact path in one place.</p>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Reference</th>
              <th>Client</th>
              <th>Deponent</th>
              <th>Requested</th>
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
                const mailto = buildMailto({
                  to: counselEmails,
                  subject: `Deposition scheduling request - ${matter.referenceNumber}`,
                  body: [
                    `Matter: ${matter.referenceNumber} / ${matter.clientName}`,
                    `Deponent: ${deposition.fullName}`,
                    "",
                    "Please provide your availability for this deposition.",
                  ].join("\n"),
                });

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
                    <td>{formatDate(deposition.requestedDate)}</td>
                    <td>{formatDate(deposition.scheduledDate)}</td>
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
                        <CounselActions mailto={mailto} emails={counselEmails} />
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
