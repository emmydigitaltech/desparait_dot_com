import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminRole } from "@/lib/admin";
import { can } from "@/lib/admin-roles";
import ReportActions from "./ReportActions";

const LABEL: Record<string, string> = {
  scam: "Scam or fraud",
  fake: "Fake or misleading",
  prohibited: "Prohibited item",
  harassment: "Harassment or abuse",
  wrong_category: "Wrong category",
  other: "Something else",
};

export default function ReportsPage() {
  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: 16 }}>
      <Suspense fallback={<p>Loading reports...</p>}>
        <Reports />
      </Suspense>
    </main>
  );
}

async function Reports() {
  await connection();
  if (!can(await getAdminRole(), ["moderator"])) redirect("/");

  const admin = await createAdminClient();
  const { data: reports } = await admin
    .from("reports")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: true });
  const list = (reports ?? []) as any[];

  const userIds = [...new Set(list.flatMap((r) => [r.reporter_id, r.reported_user_id]))];
  const listingIds = [...new Set(list.map((r) => r.listing_id).filter(Boolean))];

  const [{ data: profs }, { data: listings }, authRes] = await Promise.all([
    admin.from("profiles").select("id, full_name").in("id", userIds.length ? userIds : [""]),
    admin.from("listings").select("id, title, status").in("id", listingIds.length ? listingIds : [""]),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);
  const name = new Map((profs ?? []).map((p: any) => [p.id, p.full_name ?? "(no name)"]));
  const listing = new Map((listings ?? []).map((l: any) => [l.id, l]));
  const email = new Map((authRes.data?.users ?? []).map((u) => [u.id, u.email ?? ""]));

  const perTarget = new Map<string, number>();
  for (const r of list) {
    const k = r.listing_id ?? r.reported_user_id;
    perTarget.set(k, (perTarget.get(k) ?? 0) + 1);
  }

  return (
    <>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>
        Reports ({list.length})
      </h1>
      {list.length === 0 && <p style={{ opacity: 0.7 }}>No open reports.</p>}
      <div style={{ display: "grid", gap: 12 }}>
        {list.map((r) => {
          const l: any = r.listing_id ? listing.get(r.listing_id) : null;
          const count = perTarget.get(r.listing_id ?? r.reported_user_id) ?? 1;
          return (
            <div key={r.id} style={{ border: "1px solid var(--dp-line)", borderRadius: 10, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <strong>{LABEL[r.reason] ?? r.reason}</strong>
                {count > 1 && (
                  <span style={{ fontSize: 12, color: "#f59e0b", fontWeight: 700 }}>
                    {count} open reports on this {r.listing_id ? "listing" : "user"}
                  </span>
                )}
              </div>
              <p style={{ fontSize: 13, marginTop: 6 }}>
                {r.listing_id ? (
                  <>
                    Listing:{" "}
                    <Link href={`/listings/${r.listing_id}`} target="_blank" style={{ textDecoration: "underline" }}>
                      {l?.title ?? "(deleted)"}
                    </Link>{" "}
                    {l?.status && <span style={{ opacity: 0.7 }}>({l.status})</span>}
                    <br />
                  </>
                ) : null}
                Seller/user: {name.get(r.reported_user_id)} ·{" "}
                <Link href={`/admin/users?q=${encodeURIComponent(email.get(r.reported_user_id) ?? "")}`}
                  style={{ textDecoration: "underline" }}>
                  {email.get(r.reported_user_id)}
                </Link>
              </p>
              {r.details && <p style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{r.details}</p>}
              <p style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>
                Reported by {name.get(r.reporter_id)} · {new Date(r.created_at).toISOString().slice(0, 10)}
              </p>
              <ReportActions id={r.id} hasListing={!!r.listing_id && l?.status !== "rejected"} />
            </div>
          );
        })}
      </div>
    </>
  );
}