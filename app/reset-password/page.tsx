"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const supabase = createClient();
  const router = useRouter();
  const started = useRef(false);

  const [ready, setReady] = useState(false);
  const [checked, setChecked] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    // Hash-token flow: the client reads the URL hash and fires PASSWORD_RECOVERY.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setReady(true);
        setChecked(true);
      }
    });

    // PKCE flow: the link carries ?code=...
    const code = new URLSearchParams(window.location.search).get("code");
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) setErr(error.message);
        else setReady(true);
        setChecked(true);
      });
    } else {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) setReady(true);
      });
    }

    const t = setTimeout(() => setChecked(true), 2500);
    return () => {
      clearTimeout(t);
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (password.length < 8) return setErr("Password must be at least 8 characters.");
    if (password !== confirm) return setErr("Passwords do not match.");

    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setErr(error.message);
      setBusy(false);
      return;
    }
    await supabase.auth.signOut();
    setDone(true);
    setTimeout(() => router.replace("/login"), 2000);
  }

  return (
    <div className="dp-auth">
      <h1>Set a new password</h1>

      {done ? (
        <p className="dp-ok">Password updated. Redirecting to sign in...</p>
      ) : ready ? (
        <form className="dp-form" onSubmit={onSubmit} style={{ marginTop: 16 }}>
          <label>
            New password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </label>
          <label>
            Confirm password
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />
          </label>
          {err && <p className="dp-err">{err}</p>}
          <button className="dp-btn" type="submit" disabled={busy}>
            {busy ? "Saving..." : "Update password"}
          </button>
        </form>
      ) : checked ? (
        <>
          <p className="dp-err" style={{ marginTop: 12 }}>
            {err || "This reset link is invalid or has expired."}
          </p>
          <p style={{ marginTop: 12 }}>
            <a href="/login">Back to sign in</a>
          </p>
        </>
      ) : (
        <p className="dp-ok">Checking your link...</p>
      )}
    </div>
  );
}