import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
<p className="dp-lc-rate">
  <Stars rating={Number(rating_avg ?? 0)} />
  {Number(rating_count ?? 0) > 0 ? (
    <>
      <span>{Number(rating_avg).toFixed(1)}</span>
      <span className="dp-lc-rcount">({Number(rating_count).toLocaleString()})</span>
    </>
  ) : (
    <span className="dp-lc-rcount">No reviews</span>
  )}
</p>

type Status = "pending" | "inspected" | "paid_claimed" | "completed" | "cancelled" | "disputed";
type Order = {
  id: string;
  conversation_id: string;
  listing_id: string | null;
  buyer_id: string;
  seller_id: string;
  title: string;
  price: number;
  status: Status;
  created_at: string;
};

const naira = (n: number) => `₦${n.toLocaleString()}`;
const LABEL: Record<Status, string> = {
  pending: "Waiting for inspection",
  inspected: "Ready to pay",
  paid_claimed: "Payment sent",
  completed: "Completed",
  cancelled: "Cancelled",
  disputed: "Problem reported",
};
const OPEN: Status[] = ["pending", "inspected", "paid_claimed", "disputed"];

export default function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  return (
    <Suspense fallback={<p className="dp-meta" style={{ padding: 16 }}>Loading orders…</p>}>
      <Loader searchParams={searchParams} />
    </Suspense>
  );
}

async function Loader({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await connection(); // before any Supabase call

  const { tab } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("orders")
    .select("id, conversation_id, listing_id, buyer_id, seller_id, title, price, status, created_at")
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  const all = (data ?? []) as Order[];
  const buying = all.filter((o) => o.buyer_id === user.id);
  const selling = all.filter((o) => o.seller_id === user.id);
  const active = tab === "selling" ? "selling" : "buying";
  const rows = active === "buying" ? buying : selling;

  // open orders first, then newest
  rows.sort((a, b) => {
    const ao = OPEN.includes(a.status) ? 0 : 1;
    const bo = OPEN.includes(b.status) ? 0 : 1;
    return ao - bo || +new Date(b.created_at) - +new Date(a.created_at);
  });

  // counterparty names
  const otherIds = [
    ...new Set(rows.map((o) => (o.buyer_id === user.id ? o.seller_id : o.buyer_id))),
  ];
  const names = new Map<string, string>();
  if (otherIds.length) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", otherIds);
    (profs ?? []).forEach((p) => names.set(p.id, p.full_name ?? "User"));
  }

  // is it my turn to act?
  const myTurn = (o: Order) =>
    (o.buyer_id === user.id && (o.status === "pending" || o.status === "inspected")) ||
    (o.seller_id === user.id && o.status === "paid_claimed");

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "16px" }}>
      <h1 style={{ marginBottom: 12 }}>Orders</h1>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <Link
          href="/orders?tab=buying"
          className={active === "buying" ? "dp-btn" : "dp-btn-o"}
        >
          Buying ({buying.length})
        </Link>
        <Link
          href="/orders?tab=selling"
          className={active === "selling" ? "dp-btn" : "dp-btn-o"}
        >
          Selling ({selling.length})
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="dp-meta">
          {active === "buying"
            ? "You haven’t bought anything yet."
            : "No one has started an order on your listings yet."}
        </p>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {rows.map((o) => {
            const otherId = o.buyer_id === user.id ? o.seller_id : o.buyer_id;
            return (
              <Link
                key={o.id}
                href={`/messages/${o.conversation_id}`}
                className="dp-order"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div className="dp-order-title">
                  <span>{o.title} · {naira(o.price)}</span>
                  <span className="dp-order-badge">{LABEL[o.status]}</span>
                </div>
                <small className="dp-meta">
                  {active === "buying" ? "Seller" : "Buyer"}: {names.get(otherId) ?? "User"} ·{" "}
                  {new Date(o.created_at).toLocaleDateString()}
                  {myTurn(o) && <strong> · Your turn</strong>}
                </small>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}