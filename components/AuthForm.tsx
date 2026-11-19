"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type School = { id: string; name: string };

export default function AuthForm({
  mode,
  next,
  schools = [],
}: {
  mode: "login" | "signup";
  next: string;
  schools?: School[];
}) {
  const router = useRouter();
  const isSignup = mode === "signup";
  const [name, setName] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [showPw, setShowPw] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (isSignup && !schoolId) return setErr("Please choose your university.");

    setBusy(true);
    const supabase = createClient();

    if (isSignup) {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: name.trim(), school_id: schoolId },
          emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      setBusy(false);
      if (error) return setErr(error.message);
      if (data.session) {
        router.replace(next);
        router.refresh();
      } else {
        setSent(true); // email confirmation is switched on in Supabase
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      setBusy(false);
      if (error) return setErr(error.message);
      router.replace(next);
      router.refresh();
    }
  }

  if (sent)
    return (
      <div className="dp-auth">
        <h1>Check your email</h1>
        <p className="dp-ok">
          We sent a confirmation link to <b>{email}</b>. Open it to finish creating your account, then sign in.
        </p>
        <Link href="/login" className="dp-btn">Go to sign in</Link>
      </div>
    );

  return (
    <div className="dp-auth">
      <h1>{isSignup ? "Create your account" : "Welcome back"}</h1>
      <p className="dp-meta">
        {isSignup ? "Buy and sell on campus. Meet in person, inspect, then pay." : "Sign in to your Despariat account."}
      </p>

      <button type="button" className="dp-google" disabled aria-disabled="true">
        Continue with Google <span>Coming soon</span>
      </button>
      <div className="dp-or"><span>or use email</span></div>

      <form onSubmit={submit} className="dp-form">
        {isSignup && (
          <label>
            Full name
            <input value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
          </label>
        )}
        {isSignup && (
          <label>
            Your university
            <select value={schoolId} onChange={(e) => setSchoolId(e.target.value)} required>
              <option value="" disabled>Select your university</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <span className="dp-meta">
              You will only see listings from your university, and this can&apos;t be changed later.
            </span>
          </label>
        )}
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label>
          Password
          <div className="dp-pw">
            <input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete={isSignup ? "new-password" : "current-password"}
            />
            <button
              type="button"
              className="dp-pw-eye"
              onClick={() => setShowPw((s) => !s)}
              aria-label={showPw ? "Hide password" : "Show password"}
              aria-pressed={showPw}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                <circle cx="12" cy="12" r="3" />
                {showPw && <path d="M3 3l18 18" />}
              </svg>
            </button>
          </div>
        </label>
        {isSignup && <span className="dp-meta">At least 8 characters.</span>}
        {err && <p className="dp-err" role="alert">{err}</p>}
        <button type="submit" className="dp-btn" disabled={busy}>
          {busy ? "Please wait…" : isSignup ? "Create account" : "Sign in"}
        </button>
      </form>

      <p className="dp-meta" style={{ marginTop: 14 }}>
        {isSignup ? (
          <>Already have an account? <Link href="/login">Sign in</Link></>
        ) : (
          <>New here? <Link href="/signup">Create an account</Link></>
        )}
      </p>
      {isSignup && (
        <p className="dp-meta">
          By creating an account you agree to our <Link href="/terms">Terms of Service</Link> and{" "}
          <Link href="/privacy">Privacy Policy</Link>.
        </p>
      )}
    </div>
  );
}