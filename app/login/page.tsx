import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="login-page">
      <section className="login-card stack">
        <span className="badge">Private deposition command center</span>
        <h1 className="login-title">DepoCat</h1>
        <p className="muted">
          Sign in with your DepoCat user account to track matters, deponents, counsel contacts,
          and the three-step deposition follow-up rhythm.
        </p>
        <LoginForm />
      </section>
    </main>
  );
}
