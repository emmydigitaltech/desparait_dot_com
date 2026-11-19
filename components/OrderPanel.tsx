"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Status = "pending" | "inspected" | "paid_claimed" | "completed" | "cancelled" | "disputed";
type Order = {
  id: string;
  listing_id: string | null;
  buyer_id: string;
  seller_id: string;
  title: string;
  price: number;
  status: Status;
};
type Bank = { bank_name: string; account_number: string; account_name: string };
type Pos = { lat: number; lng: number; acc: number };

const naira = (n: number) => `₦${n.toLocaleString()}`;
const LABEL: Record<Status, string> = {
  pending: "Waiting for inspection",
  inspected: "Ready to pay",
  paid_claimed: "Payment sent",
  completed: "Completed",
  cancelled: "Cancelled",
  disputed: "Problem reported",
};

function getPosition(): Promise<Pos | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 20000 }
    );
  });
}

export default function OrderPanel({
  conversationId,
  me,
  buyerId,
  listingPrice,
}: {
  conversationId: string;
  me: string;
  buyerId: string;
  listingPrice: number;
}) {
  const supabase = createClient();
  const isBuyer = me === buyerId;
  const [order, setOrder] = useState<Order | null>(null);
  const [bank, setBank] = useState<Bank | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [codeExp, setCodeExp] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [locOff, setLocOff] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [handoverDone, setHandoverDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const expRef = useRef(0);
  const lastFetch = useRef(0);
  const posRef = useRef<Pos | null>(null);

  const loadOrder = useCallback(async () => {
    const { data } = await supabase
      .from("orders")
      .select("id, listing_id, buyer_id, seller_id, title, price, status")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setOrder((data as Order) ?? null);
  }, [conversationId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadOrder();
    const ch = supabase
      .channel(`order-${conversationId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `conversation_id=eq.${conversationId}` },
        () => loadOrder()
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [conversationId, loadOrder]); // eslint-disable-line react-hooks/exhaustive-deps

  // fetch the seller's account only when the database allows it
  useEffect(() => {
    if (!isBuyer || !order || !["inspected", "paid_claimed", "disputed"].includes(order.status)) {
      setBank(null);
      return;
    }
    let cancelled = false;
    supabase.rpc("get_seller_bank", { p_order_id: order.id }).then(({ data }) => {
      if (!cancelled) setBank((data as Bank[] | null)?.[0] ?? null);
    });
    return () => { cancelled = true; };
  }, [order?.id, order?.status, isBuyer]); // eslint-disable-line react-hooks/exhaustive-deps

  // buyer: rotating handover code, refreshed with the buyer's location
  useEffect(() => {
    if (!isBuyer || !order || !["pending", "inspected", "paid_claimed"].includes(order.status)) {
      setCode(null);
      return;
    }
    let cancelled = false;
    let fetching = false;
    const orderId = order.id;

    async function refresh(first: boolean) {
      if (fetching) return;
      fetching = true;
      // the first fetch waits for GPS; later ones use the last known spot so the code is never late
      if (first) posRef.current = await getPosition();
      const pos = posRef.current;
      const { data } = await supabase.rpc("get_handover_code", {
        p_order_id: orderId,
        p_lat: pos?.lat ?? null,
        p_lng: pos?.lng ?? null,
        p_acc: pos?.acc ?? null,
      });
      fetching = false;
      if (cancelled) return;
      const d = data as { code: string; expires_in: number } | null;
      const exp = Date.now() + (d?.expires_in ?? 0) * 1000;
      expRef.current = exp;
      lastFetch.current = Date.now();
      setLocOff(!pos);
      setCode(d?.code ?? null);
      setCodeExp(exp);
      if (!first) getPosition().then((p) => { if (p) posRef.current = p; }); // refresh GPS for next time
    }

    lastFetch.current = 0;
    expRef.current = 0;
    refresh(true);
    const t = setInterval(() => {
      setNow(Date.now());
      if (document.visibilityState !== "visible") return;
      if (Date.now() >= expRef.current) refresh(false);
    }, 500);
    return () => { cancelled = true; clearInterval(t); };
  }, [order?.id, order?.status, isBuyer]); // eslint-disable-line react-hooks/exhaustive-deps

  async function run(fn: () => PromiseLike<{ error: { message: string } | null }>, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    setErr(null);
    const { error } = await fn();
    setBusy(false);
    if (error) setErr(error.message);
    await loadOrder();
  }

  const advance = (action: string, confirmText?: string) =>
    order && run(() => supabase.rpc("advance_order", { p_order_id: order.id, p_action: action }), confirmText);

  const buy = () => run(() => supabase.rpc("create_order", { p_conversation_id: conversationId }));

  async function confirmHandover() {
    if (!order) return;
    setBusy(true);
    setErr(null);

    const pos = await getPosition();
    if (!pos) {
      setBusy(false);
      return setErr("Allow location access so Despariat can confirm you are with the buyer.");
    }

    const { data, error } = await supabase.rpc("confirm_handover", {
      p_order_id: order.id,
      p_code: codeInput.trim(),
      p_lat: pos.lat,
      p_lng: pos.lng,
      p_acc: pos.acc,
    });
    setBusy(false);

    if (error) setErr(error.message);
    else if (data === "wrong")
      setErr("That code is wrong or has expired. It changes every 15 seconds, so ask the buyer to show you the current one.");
    else if (data === "locked")
      setErr("Too many wrong attempts. Ask the buyer to report a problem, or contact support.");
    else if (data === "no_code")
      setErr("The buyer has not opened this order yet. Ask them to open this chat so their code is created.");
    else if (data === "need_location")
      setErr("Allow location access so Despariat can confirm you are with the buyer.");
    else if (data === "buyer_location")
      setErr("The buyer's order screen is not open. Ask them to open it on their phone with location allowed, keep it on screen, then try again.");
    else if (data === "too_far")
      setErr("You and the buyer do not seem to be together. Handovers have to happen in person.");
    else if (data === "ok") {
      setHandoverDone(true);
      setCodeInput("");
    }
    await loadOrder();
  }

  async function copyNumber() {
    if (!bank) return;
    await navigator.clipboard.writeText(bank.account_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const open = order && ["pending", "inspected", "paid_claimed", "disputed"].includes(order.status);

  // no open order: buyer can start one
  if (!open && order?.status !== "completed") {
    if (!isBuyer) return null;
    return (
      <div className="dp-order dp-order-cta">
        <p>Ready to buy? Start an order, then meet the seller and inspect the item before paying.</p>
        <button type="button" className="dp-btn" onClick={buy} disabled={busy}>
          {busy ? "Starting…" : `Buy · ${naira(listingPrice)}`}
        </button>
        {order?.status === "cancelled" && <small className="dp-meta">Your last order was cancelled.</small>}
        {err && <p className="dp-err" role="alert">{err}</p>}
      </div>
    );
  }

  if (!order) return null;

  const sellerCanEnterCode = !isBuyer && ["inspected", "paid_claimed"].includes(order.status);
  const secondsLeft = Math.max(0, Math.ceil((codeExp - now) / 1000));

  return (
    <div className="dp-order">
      <div className="dp-order-title">
        <span>{order.title} · {naira(order.price)}</span>
        <span className="dp-order-badge">{LABEL[order.status]}</span>
      </div>

      {/* ---------- buyer: rotating handover code ---------- */}
      {isBuyer && code && ["pending", "inspected", "paid_claimed"].includes(order.status) && (
        <div className="dp-handover">
          <small>Your handover code · changes in {secondsLeft}s</small>
          <span className="dp-handover-code">{code}</span>
          <small className="dp-meta">
            Show this to the seller in person, only when you have the item and are happy with it. Keep this screen
            open. Never send the code in chat or read it out over a call.
          </small>
          {locOff && (
            <small className="dp-err">
              Location is off. Allow location so Despariat can confirm you and the seller are together. It is used
              only for this check and deleted afterwards.
            </small>
          )}
        </div>
      )}

      {/* ---------- pending ---------- */}
      {order.status === "pending" && isBuyer && (
        <>
          <p>Meet the seller and inspect the item first. Once you have seen it, tap below to unlock the seller’s payout details.</p>
          <div className="dp-order-actions">
            <button type="button" className="dp-btn" disabled={busy}
              onClick={() => advance("inspected", "Only confirm if you have physically seen the item. Continue?")}>
              I’ve seen the product
            </button>
            <button type="button" className="dp-btn-o" disabled={busy} onClick={() => advance("cancel", "Cancel this order?")}>
              Cancel order
            </button>
          </div>
        </>
      )}
      {order.status === "pending" && !isBuyer && (
        <>
          <p>The buyer started an order. Waiting for them to inspect the item.</p>
          <div className="dp-order-actions">
            <button type="button" className="dp-btn-o" disabled={busy} onClick={() => advance("cancel", "Cancel this order?")}>
              Cancel order
            </button>
          </div>
        </>
      )}

      {/* ---------- buyer: account details ---------- */}
      {isBuyer && bank && ["inspected", "paid_claimed", "disputed"].includes(order.status) && (
        <div className="dp-order-bank">
          <small>Send {naira(order.price)} to</small>
          <span className="num">{bank.account_number}</span>
          <strong>{bank.account_name}</strong>
          <span>{bank.bank_name}</span>
          <div className="dp-order-actions" style={{ marginTop: 6 }}>
            <button type="button" className="dp-btn-o" onClick={copyNumber}>
              {copied ? "Copied ✓" : "Copy account number"}
            </button>
          </div>
          <small className="dp-meta">Check that the account name matches the seller before you send.</small>
        </div>
      )}

      {/* ---------- inspected ---------- */}
      {order.status === "inspected" && isBuyer && (
        <div className="dp-order-actions">
          <button type="button" className="dp-btn" disabled={busy}
            onClick={() => advance("paid", "Only tap this after you have actually sent the money. Continue?")}>
            I’ve paid
          </button>
          <button type="button" className="dp-btn-o" disabled={busy} onClick={() => advance("cancel", "Cancel this order?")}>
            Cancel order
          </button>
        </div>
      )}
      {order.status === "inspected" && !isBuyer && (
        <>
          <p>The buyer has seen the item and can now see your payout account. Waiting for payment.</p>
          <div className="dp-order-actions">
            <button type="button" className="dp-btn-o" disabled={busy} onClick={() => advance("cancel", "Cancel this order?")}>
              Cancel order
            </button>
          </div>
        </>
      )}

      {/* ---------- paid_claimed ---------- */}
      {order.status === "paid_claimed" && !isBuyer && (
        <p>The buyer says they sent {naira(order.price)}. Check your bank app and confirm the money has arrived.</p>
      )}
      {order.status === "paid_claimed" && isBuyer && <p>Waiting for the seller to confirm your payment.</p>}

      {/* ---------- seller: enter the buyer's code ---------- */}
      {sellerCanEnterCode && (
        <div className="dp-handover-enter">
          <label>
            <small>
              When you are together and the money is in your account, ask the buyer to show you the code on their
              phone and type it here. It changes every 15 seconds. The buyer must keep their order screen open, and
              you must both allow location. This completes the sale and earns you points.
            </small>
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="6-digit code"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, ""))}
              autoComplete="off"
            />
          </label>
          <button type="button" className="dp-btn" disabled={busy || codeInput.length !== 6} onClick={confirmHandover}>
            {busy ? "Checking…" : "Confirm handover"}
          </button>
        </div>
      )}
      {order.status === "paid_claimed" && !isBuyer && (
        <div className="dp-order-actions">
          <button type="button" className="dp-btn-o" disabled={busy}
            onClick={() => advance("received", "Complete without the buyer's code? You will not earn points for this sale. Continue?")}>
            Complete without code (no points)
          </button>
          <button type="button" className="dp-btn-o" disabled={busy}
            onClick={() => advance("dispute", "Report a problem with this order?")}>
            I haven’t received it
          </button>
        </div>
      )}
      {order.status === "paid_claimed" && isBuyer && (
        <div className="dp-order-actions">
          <button type="button" className="dp-btn-o" disabled={busy}
            onClick={() => advance("dispute", "Report a problem with this order?")}>
            Report a problem
          </button>
        </div>
      )}

      {/* ---------- end states ---------- */}
      {order.status === "disputed" && (
        <p>A problem was reported. The Despariat team will review this order. Please don’t send more money in the meantime.</p>
      )}
      {order.status === "completed" && (
        <>
          <p>✅ Order complete.</p>
          {handoverDone && (
            <small className="dp-meta">Points for this sale appear after 48 hours if it qualifies.</small>
          )}
          {isBuyer && order.listing_id && (
            <Link href={`/listings/${order.listing_id}`} className="dp-btn-o" style={{ alignSelf: "flex-start" }}>
              Rate this seller
            </Link>
          )}
        </>
      )}

      {err && <p className="dp-err" role="alert">{err}</p>}
    </div>
  );
}