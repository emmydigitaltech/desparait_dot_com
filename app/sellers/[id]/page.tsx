import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LISTING_SELECT, type Listing } from "@/lib/types";
import ListingGrid from "@/components/ListingGrid";
import VerifiedBadge from "@/components/VerifiedBadge";

async function Seller({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const supabase = await createClient();

  const { data: p } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, campus, school_id, is_verified")
    .eq("id", id)
    .maybeSingle();
  if (!p) notFound();

  const [{ data: school }, { data: rows }] = await Promise.all([
    p.school_id
      ? supabase.from("schools").select("name").eq("id", p.school_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("listings")
      .select(LISTING_SELECT)
      .eq("seller_id", id)
      .eq("status", "active")
      .order("created_at", { ascending: false }),
  ]);
  const items = (rows ?? []) as unknown as Listing[];
  const name = p.full_name ?? "Seller";

  return (
    <main className="dp-main">
      <Link href="/browse" className="dp-link">← Back to browse</Link>

      <div
        className="dp-panel"
        style={{ display: "flex", gap: 16, alignItems: "center", margin: "16px 0 24px" }}
      >
        {p.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.avatar_url}
            alt={name}
            style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "var(--dp-line)",
              display: "grid",
              placeItems: "center",
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <h1
            style={{
              fontSize: "1.3rem",
              fontWeight: 800,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {name}
            {p.is_verified && <VerifiedBadge size={18} />}
          </h1>
          <p className="dp-mut" style={{ marginTop: 4, fontSize: 14 }}>
            {[school?.name, p.campus].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>

      <h2 style={{ fontWeight: 700, marginBottom: 12 }}>Listings ({items.length})</h2>
      {items.length === 0 ? (
        <p className="dp-mut">No active listings.</p>
      ) : (
        <ListingGrid items={items} />
      )}
    </main>
  );
}

export default function Page(props: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="p-6">Loading…</p>}>
      <Seller params={props.params} />
    </Suspense>
  );
}