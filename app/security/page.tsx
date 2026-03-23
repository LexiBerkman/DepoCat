import { format } from "date-fns";
import { Cat, PawPrint, ShieldCheck } from "lucide-react";

import { ChangePasswordForm } from "@/components/change-password-form";
import { OwnerResetPasswordForm } from "@/components/owner-reset-password-form";
import { TopNav } from "@/components/top-nav";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { securityChecklist } from "@/lib/security";

export default async function SecurityPage() {
  const session = await requireSession();

  const [users, recentAudit] = await Promise.all([
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

  return (
    <main className="shell">
      <TopNav currentPath="/security" fullName={session.fullName} role={session.role} />

      <section className="hero-card">
        <div className="stack">
          <span className="badge">
            <Cat size={16} />
            Security controls and account management
          </span>
          <div className="security-cat-row" aria-hidden="true">
            <span className="security-cat-chip">
              <Cat size={16} />
            </span>
            <span className="security-cat-chip">
              <PawPrint size={14} />
            </span>
            <span className="security-cat-chip">
              <Cat size={14} />
            </span>
          </div>
          <h1 className="hero-title">Security</h1>
          <p className="hero-subtitle">
            Keep passwords current, manage user access, and review recent activity without cluttering
            the deposition workflow screen.
          </p>
          <div className="cat-note">
            <PawPrint size={16} />
            The locks, logs, and account controls stay here instead of prowling across the tracker.
          </div>
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
              Keep the live system practical and safer for daily legal work.
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

      <section className="panel stack">
        <div>
          <h2 className="section-title">Security features</h2>
          <p className="muted">
            The live app protections and deployment safeguards stay documented here, not on the tracker.
          </p>
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
      </section>

      {session.role === "OWNER" ? (
        <section className="content-grid security-admin-grid">
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
    </main>
  );
}
