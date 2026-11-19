"use client";

import { useState } from "react";
import Link from "next/link";

type Period = { revenue: number; orders: number };
type Day = { day: string; revenue: number; orders: number };
type Row = {
  id: string | null;
  title: string | null;
  image_url: string | null;
  today_rev: number; today_n: number;
  yest_rev: number; yest_n: number;
  month_rev: number; month_n: number;
};
export type AnalyticsData = {
  periods: { today: Period; yesterday: Period; month: Period };
  open: number;
  live: number;
  sold_out: number;
  low_stock: number;
  daily: Day[];
  listings: Row[];
};

type Tab = "today" | "yesterday" | "month";
const TABS: { key: Tab; label: string; prefix: "today" | "yest" | "month" }[] = [
  { key: "today", label: "Today", prefix: "today" },
  { key: "yesterday", label: "Yesterday", prefix: "yest" },
  { key: "month", label: "This month", prefix: "month" },
];

const naira = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;
const shortDay = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short" });

function niceMax(m: number) {
  if (m <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(m)));
  return Math.ceil(m / p) * p;
}

function Chart({ daily, metric, kind }: { daily: Day[]; metric: "revenue" | "orders"; kind: "bar" | "line" }) {
  const W = 640, H = 240, L = 56, R = 12, T = 12, B = 28;
  const vals = daily.map((d) => (metric === "revenue" ? d.revenue : d.orders));
  const top = metric === "orders" ? Math.max(4, Math.ceil(Math.max(...vals, 1) / 4) * 4) : niceMax(Math.max(...vals, 1));
  const iw = W - L - R, ih = H - T - B;
  const n = vals.length || 1;
  const step = iw / n;
  const y = (v: number) => T + ih - (v / top) * ih;
  const x = (i: number) => L + step * i + step / 2;
  const ticks = [0, 1, 2, 3, 4].map((i) => (top / 4) * i);
  const fmt = (v: number) => (metric === "revenue" ? (v >= 1000 ? `₦${Math.round(v / 1000)}k` : `₦${v}`) : String(Math.round(v)));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }} role="img" aria-label="Last 30 days">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#d5d9d9" strokeWidth="1" />
          <text x={L - 6} y={y(t) + 4} textAnchor="end" fontSize="10" fill="#6b7280">{fmt(t)}</text>
        </g>
      ))}
      {kind === "bar"
        ? vals.map((v, i) => (
            <rect key={i} x={x(i) - step * 0.3} width={step * 0.6} y={y(v)} height={Math.max(0, T + ih - y(v))} fill="#0f4c81">
              <title>{`${shortDay(daily[i].day)}: ${metric === "revenue" ? naira(v) : v}`}</title>
            </rect>
          ))
        : (
          <>
            <polyline fill="none" stroke="#0f4c81" strokeWidth="2" points={vals.map((v, i) => `${x(i)},${y(v)}`).join(" ")} />
            {vals.map((v, i) => (
              <circle key={i} cx={x(i)} cy={y(v)} r="3" fill="#0f4c81">
                <title>{`${shortDay(daily[i].day)}: ${metric === "revenue" ? naira(v) : v}`}</title>
              </circle>
            ))}
          </>
        )}
      {daily.map((d, i) =>
        i % 4 === 0 ? (
          <text key={d.day} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="#6b7280">{shortDay(d.day)}</text>
        ) : null
      )}
    </svg>
  );
}

export default function SellerAnalytics({ data }: { data: AnalyticsData }) {
  const [tab, setTab] = useState<Tab>("month");
  const [metric, setMetric] = useState<"revenue" | "orders">("revenue");
  const [kind, setKind] = useState<"bar" | "line">("bar");

  const p = data.periods[tab];
  const prefix = TABS.find((t) => t.key === tab)!.prefix;
  const rows = data.listings
    .map((r) => ({ ...r, rev: Number(r[`${prefix}_rev` as keyof Row]), n: Number(r[`${prefix}_n` as keyof Row]) }))
    .filter((r) => r.n > 0)
    .sort((a, b) => b.rev - a.rev)
    .slice(0, 5);

  const TabBar = () => (
    <div className="dp-tabs" role="tablist">
      {TABS.map((t) => (
        <button key={t.key} type="button" role="tab" aria-selected={tab === t.key}
          className={`dp-tab ${tab === t.key ? "is-on" : ""}`} onClick={() => setTab(t.key)}>
          {t.label}
        </button>
      ))}
    </div>
  );

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <header>
        <h1 className="text-xl font-semibold">Sales dashboard</h1>
        <p className="dp-mut text-sm">
          Counts orders you confirmed as paid. All times are Lagos time.
        </p>
      </header>

      <section className="dp-panel">
        <TabBar />
        <div className="dp-stat-grid">
          <div>
            <p className="dp-mut text-sm font-medium">Sales</p>
            <p className="dp-stat-big">{naira(p.revenue)}</p>
            <p className="dp-mut text-xs">Confirmed payments</p>
          </div>
          <div>
            <p className="dp-mut text-sm font-medium">Orders</p>
            <p className="dp-stat-big">{p.orders}</p>
            <p className="dp-mut text-xs">Completed</p>
          </div>
          <div>
            <p className="dp-mut text-sm font-medium">Open orders</p>
            <p className="dp-stat-big">{data.open}</p>
            <Link href="/orders" className="dp-link text-xs">View orders</Link>
          </div>
        </div>
      </section>

      <section className="dp-panel">
        <div className="dp-tabs" role="tablist">
          {(["revenue", "orders"] as const).map((m) => (
            <button key={m} type="button" role="tab" aria-selected={metric === m}
              className={`dp-tab ${metric === m ? "is-on" : ""}`} onClick={() => setMetric(m)}>
              {m === "revenue" ? "Sales" : "Orders"}
            </button>
          ))}
        </div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-medium">Last 30 days</h2>
          <div className="dp-seg">
            <button type="button" className={kind === "line" ? "is-on" : ""} onClick={() => setKind("line")}>Line</button>
            <button type="button" className={kind === "bar" ? "is-on" : ""} onClick={() => setKind("bar")}>Bar</button>
          </div>
        </div>
        <Chart daily={data.daily} metric={metric} kind={kind} />
      </section>

      <section className="dp-panel">
        <TabBar />
        <h2 className="mb-3 font-medium">Top-selling listings</h2>
        {rows.length === 0 ? (
          <p className="dp-mut text-sm">No sales in this period yet.</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((r, i) => (
              <li key={r.id ?? i} className="flex items-center gap-3">
                <span className="dp-mut w-4 text-sm">{i + 1}</span>
                {r.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.image_url} alt="" className="h-10 w-10 rounded object-cover" />
                ) : (
                  <span className="h-10 w-10 rounded" style={{ background: "#e5e7eb" }} />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.title ?? "Deleted listing"}</p>
                  <p className="dp-mut text-xs">{r.n} sold</p>
                </div>
                <strong className="text-sm">{naira(r.rev)}</strong>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="dp-panel">
        <h2 className="mb-2 font-medium">Your listings</h2>
        <div className="dp-stat-grid">
          <div><p className="dp-stat-big">{data.live}</p><p className="dp-mut text-xs">Live</p></div>
          <div><p className="dp-stat-big">{data.low_stock}</p><p className="dp-mut text-xs">Low stock (2 or fewer)</p></div>
          <div><p className="dp-stat-big">{data.sold_out}</p><p className="dp-mut text-xs">Sold out</p></div>
        </div>
        <Link href="/listings" className="dp-link mt-3 inline-block text-sm">Manage listings and restock</Link>
      </section>

      <Link href="/dashboard" className="dp-link text-sm">← Back to dashboard</Link>
    </main>
  );
}