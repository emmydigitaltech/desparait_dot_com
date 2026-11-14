"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Bank = { name: string; code: string };
type Saved = { bank_name: string; account_number: string; account_name: string };

export default function BankDetailsForm({ onSaved }: { onSaved?: () => void }) {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [bankCode, setBankCode] = useState("");
  const [number, setNumber] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "ok" | "fail">("idle");
  const [saved, setSaved] = useState<Saved | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    fetch("/api/banks")
      .then((r) => r.json())
      .then((j) => setBanks(j.banks ?? []))
      .catch(() => setErr("Couldn't load the bank list."));
    createClient()
      .from("seller_bank_details")
      .select("bank_name, account_number, account_name")
      .maybeSingle()
      .then(({ data }) => setSaved(data));
  }, []);

  // look the name up as soon as bank + 10 digits are in
  useEffect(() => {
    setName("");
    setOk(false);
    if (!bankCode || number.length !== 10) {
      setStatus("idle");
      return;
    }
    let cancelled = false;
    setStatus("checking");
    fetch(`/api/bank/resolve?account_number=${number}&bank_code=${bankCode}`)
      .then(async (r) => {
        const j = await r.json();
        if (cancelled) return;
        if (r.ok && j.account_name) {
          setName(j.account_name);
          setStatus("ok");
        } else setStatus("fail");
      })
      .catch(() => { if (!cancelled) setStatus("fail"); });
    return () => { cancelled = true; };
  }, [bankCode, number]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (status !== "ok") return;
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/bank/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bank_code: bankCode, account_number: number }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setErr(j.error ?? "Couldn't save.");
    setSaved({ bank_name: j.bank_name, account_number: number, account_name: j.account_name });
    setOk(true);
    onSaved?.();
  }

  return (
    <form onSubmit={save} className="dp-bank">
      {saved && (
        <div className="dp-bank-saved">
          <small>Current payout account</small>
          <div>{saved.bank_name} · {saved.account_number}</div>
          <strong>{saved.account_name}</strong>
        </div>
      )}

      <label>
        Bank
        <select value={bankCode} onChange={(e) => setBankCode(e.target.value)} required>
          <option value="">{banks.length ? "Select your bank" : "Loading banks…"}</option>
          {banks.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
        </select>
      </label>

      <label>
        Account number
        <input
          value={number}
          onChange={(e) => setNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
          inputMode="numeric"
          autoComplete="off"
          maxLength={10}
          placeholder="10 digits"
          required
        />
      </label>

      <label>
        Account name
        <input value={name} readOnly placeholder="Appears automatically" />
        <span className="dp-bank-status">
          {status === "checking" && "Verifying…"}
          {status === "ok" && "✓ Account verified"}
          {status === "fail" && "Couldn't verify this account. Check the bank and number."}
        </span>
      </label>

      <p className="dp-meta">
        Buyers only see these details after they confirm they have seen your item. Use your own account only.
      </p>

      {err && <p className="dp-err" role="alert">{err}</p>}
      {ok && <p className="dp-ok">Saved ✓</p>}

      <button type="submit" className="dp-btn" disabled={busy || status !== "ok"}>
        {busy ? "Saving…" : "Save payout account"}
      </button>
    </form>
  );
}