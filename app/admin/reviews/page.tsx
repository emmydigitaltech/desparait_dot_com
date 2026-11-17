import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminRole } from "@/lib/admin";
import { can } from "@/lib/admin-roles";
import ReviewActions from "@/components/ReviewActions";

type SP = Promise<{ q?: string }>;

export default function ReviewsPage({ searchParams }: { searchParams: SP }) {
  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: 16 }}>
      <Suspense fallback={<p>Loading reviews...</p>}>
        <Reviews searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Reviews({ searchParams }: { searchParams: SP }) {
  await connection();
  if (!can(await getAdminRole(), ["moderator"])) redirect("/");
  const { q = "" } = await searchParams;

  const admin = await createAdminClient();
  const { data: reviews } = await admin
    .from("seller_reviews")
    .select("id, seller_id, reviewer_id, listing_id, rating, comment, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  const all = (reviews ?? []) as any[];

  const userIds = [...new Set(all.flatMap((r) => [r.seller_id, r.reviewer_id]))];
  const listingIds = [...new Set(all.map((r) => r.listing_id).filter(Boolean))];

  const [{ data: profs }, { data: listings }, authRes] = await Promise.all([
    admin.from("profiles").select("id, full_name").in("id", userIds.length ? userIds : [""]),
    admin.from("listings").select("id, title").in("id", listingIds.length ? listingIds : [""]),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);
  const name = new Map((profs ?? []).map((p: any) => [p.id, p.full_name ?? "(no name)"]));
  const title = new Map((listings ?? []).map((l: any) => [l.id, l.title]));
  const email = new Map((authRes.data?.users ?? []).map((u) => [u.id, u.email ?? ""]));
  const joined = new Map((authRes.data?.users ?? []).map((u) => [u.id, u.created_at]));

  const byReviewer = new Map<string, number>();
  for (const r of all) byReviewer.set(r.reviewer_id, (byReviewer.get(r.reviewer_id) ?? 0) + 1);

  const needle = q.trim().toLowerCase();
  const rows = (needle
    ? all.filter((r) =>
        [name.get(r.seller_id), email.get(r.seller_id), name.get(r.reviewer_id), email.get(r.reviewer_id)]
          .some((s) => (s ?? "").toLowerCase().includes(needle)))
    : all
  ).slice(0, 100);

  return (
    <>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Reviews ({rows.length})</h1>

      <form method="get" style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          name="q"
          defaultValue={q}
          placeholder="Search seller or reviewer name or email"
          style={{
            flex: 1, padding: 10, borderRadius: 8,
            border: "1px solid var(--dp-line)",
            background: "var(--dp-soft)", color: "var(--dp-fg)",
          }}
        />
        <button type="submit" style={{
          padding: "0 16px", borderRadius: 8,
          border: "1px solid var(--dp-line)", background: "var(--dp-soft)", color: "var(--dp-fg)",
        }}>Search</button>
      </form>

      {rows.length === 0 && <p style={{ opacity: 0.7 }}>No reviews match.</p>}
      <div style={{ display: "grid", gap: 12 }}>
        {rows.map((r) => (
          <div key={r.id} style={{ border: "1px solid var(--dp-line)", borderRadius: 10, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <strong>{"★".repeat(r.rating)}{"☆".repeat(Math.max(0, 5 - r.rating))}</strong>
              <span style={{ fontSize: 12, opacity: 0.7 }}>
                {new Date(r.created_at).toISOString().slice(0, 10)}
              </span>
            </div>
            {r.comment && <p style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{r.comment}</p>}
            <p style={{ fontSize: 13, marginTop: 8, opacity: 0.85 }}>
              For {name.get(r.seller_id)}
              {r.listing_id ? (
                <>
                  {" "}on{" "}
                  <Link href={`/listings/${r.listing_id}`} target="_blank" style={{ textDecoration: "underline" }}>
                    {title.get(r.listing_id) ?? "(deleted listing)"}
                  </Link>
                </>
              ) : null}
              <br />
              By {name.get(r.reviewer_id)} · {email.get(r.reviewer_id)} · account joined{" "}
              {joined.get(r.reviewer_id)
                ? new Date(joined.get(r.reviewer_id)!).toISOString().slice(0, 10)
                : "?"}{" "}
              · {byReviewer.get(r.reviewer_id)} review{byReviewer.get(r.reviewer_id) === 1 ? "" : "s"}
            </p>
            <ReviewActions
              reviewId={r.id}
              reviewerId={r.reviewer_id}
              reviewerCount={byReviewer.get(r.reviewer_id) ?? 1}
            />
          </div>
        ))}
      </div>
    </>
  );
}