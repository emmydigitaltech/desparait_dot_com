"use client";

import { useCallback, useEffect, useState } from "react";
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

const naira = (n: number) => `₦${n.toLocaleString()}`;
const LABEL: Record<Status, string> = {
  pending: "Waiting for inspection",
  inspected: "Ready to pay",
  paid_claimed: "Payment sent",
  completed: "Completed",
  cancelled: "Cancelled",
  disputed: "Problem reported",
};

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
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

  return (
    <div className="dp-order">
      <div className="dp-order-title">
        <span>{order.title} · {naira(order.price)}</span>
        <span className="dp-order-badge">{LABEL[order.status]}</span>
      </div>

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
        <>
          <p>The buyer says they sent {naira(order.price)}. Check your bank app, and only confirm once the money has arrived.</p>
          <div className="dp-order-actions">
            <button type="button" className="dp-btn" disabled={busy}
              onClick={() => advance("received", "Confirm only if the money is in your account. This marks the item as sold. Continue?")}>
              Payment received
            </button>
            <button type="button" className="dp-btn-o" disabled={busy}
              onClick={() => advance("dispute", "Report a problem with this order?")}>
              I haven’t received it
            </button>
          </div>
        </>
      )}
      {order.status === "paid_claimed" && isBuyer && (
        <>
          <p>Waiting for the seller to confirm your payment.</p>
          <div className="dp-order-actions">
            <button type="button" className="dp-btn-o" disabled={busy}
              onClick={() => advance("dispute", "Report a problem with this order?")}>
              Report a problem
            </button>
          </div>
        </>
      )}

      {/* ---------- end states ---------- */}
      {order.status === "disputed" && (
        <p>A problem was reported. The Despariat team will review this order. Please don’t send more money in the meantime.</p>
      )}
      {order.status === "completed" && (
        <>
          <p>✅ Order complete.</p>
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