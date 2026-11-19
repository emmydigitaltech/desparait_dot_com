import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import RedeemBoost from "@/components/RedeemBoost";
import Splash from "@/components/Splash";

type Entry = {
  id: string;
  kind: "earn_seller" | "earn_buyer" | "redeem";
  points: number;
  status: "pending" | "available" | "cancelled";
  available_at: string | null;
  created_at: string;
  note: string | null;
  title: string | null;
};
type Summary = {
  available: number;
  pending: number;
  lifetime: number;
  next_unlock: string | null;
  entries: Entry[];
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-NG", {
    timeZone: "Africa/Lagos",
    dateStyle: "medium",
    timeStyle: "short",
  });

function label(e: Entry) {
  if (e.kind === "redeem") return e.note ?? "Redeemed for a boost";
  const t = e.title ?? "an order";
  return e.kind === "earn_seller" ? `Sold: ${t}` : `Bought: ${t}`;
}

async function Points() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=%2Fpoints");

  const [{ data, error }, { data: listings }] = await Promise.all([
    supabase.rpc("get_my_points"),
    supabase
      .from("listings")
      .select("id, title, boosted_until")
      .eq("seller_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false }),
  ]);

  const s = (data ?? { available: 0, pending: 0, lifetime: 0, next_unlock: null, entries: [] }) as Summary;
  const goal = s.available < 100 ? 100 : s.available < 250 ? 250 : null;
  const pct = goal ? Math.min(100, Math.round((s.available / goal) * 100)) : 100;

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <header>
        <h1 className="text-xl font-semibold">Points</h1>
        <p className="dp-mut text-sm">Earn points for every handover confirmed in person. Spend them on free boosts.</p>
      </header>

      {error && <p className="dp-err">Could not load your points: {error.message}</p>}

      <section className="dp-panel">
        <p className="dp-mut text-sm">Available</p>
        <p className="dp-points-big">{s.available}</p>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <span>Pending: <strong>{s.pending}</strong></span>
          <span>Earned in total: <strong>{s.lifetime}</strong></span>
        </div>
        {s.pending > 0 && s.next_unlock && (
          <p className="dp-mut mt-1 text-xs">Next points unlock {fmt(s.next_unlock)}.</p>
        )}
        <div className="dp-bar mt-4">
          <div style={{ width: `${pct}%` }} />
        </div>
        <p className="dp-mut mt-2 text-xs">
          {goal
            ? `${goal - s.available} more points for a free ${goal === 100 ? 3 : 7}-day boost.`
            : "You have enough for any reward."}
        </p>
      </section>

      <section className="dp-panel">
        <h2 className="mb-3 font-medium">Redeem</h2>
        <RedeemBoost available={s.available} listings={listings ?? []} />
      </section>

      <section className="dp-panel">
        <h2 className="mb-3 font-medium">History</h2>
        {s.entries.length === 0 ? (
          <p className="dp-mut text-sm">
            Nothing yet. Complete a sale or purchase with the handover code to earn your first points.
          </p>
        ) : (
          <ul className="space-y-3">
            {s.entries.map((e) => (
              <li key={e.id} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{label(e)}</p>
                  <p className="dp-mut text-xs">
                    {fmt(e.created_at)}
                    {e.status === "pending" && e.available_at && ` · unlocks ${fmt(e.available_at)}`}
                    {e.status === "cancelled" && " · cancelled"}
                  </p>
                </div>
                <strong
                  style={{
                    color: e.status === "cancelled" ? "#9ca3af" : e.points > 0 ? "#16a34a" : "#dc2626",
                    textDecoration: e.status === "cancelled" ? "line-through" : undefined,
                  }}
                >
                  {e.points > 0 ? `+${e.points}` : e.points}
                </strong>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="dp-panel">
        <h2 className="mb-2 font-medium">How points work</h2>
        <ul className="dp-mut list-disc space-y-1 pl-5 text-sm">
          <li>Sellers earn 5 points and buyers earn 2 for each handover confirmed in person with the code.</li>
          <li>The order must be ₦1,000 or more.</li>
          <li>Points unlock 48 hours after the handover.</li>
          <li>Limits: 5 earning handovers per day, and 2 per week with the same person.</li>
          <li>100 points gives a free 3-day boost. 250 points gives a free 7-day boost.</li>
        </ul>
      </section>

      <Link href="/dashboard" className="dp-link text-sm">← Back to dashboard</Link>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Splash />}>
      <Points />
    </Suspense>
  );
}