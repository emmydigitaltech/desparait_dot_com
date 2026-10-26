"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthForm({ mode, next }: { mode: "login" | "signup"; next: string }) {
  const router = useRouter();
  const isSignup = mode === "signup";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const supabase = createClient();

    if (isSignup) {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: name.trim() },
          emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      setBusy(false);
      if (error) return setErr(error.message);
      if (data.session) {
        router.push(next);
        router.refresh();
      } else {
        setSent(true); // email confirmation is switched on in Supabase
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      setBusy(false);
      if (error) return setErr(error.message);
      router.push(next);
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
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete={isSignup ? "new-password" : "current-password"}
          />
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
