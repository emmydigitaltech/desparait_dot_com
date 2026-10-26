"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Listing = {
  id: string;
  title: string;
  price: number;
  image_url: string | null;
  condition: string | null;
  status: string | null;
  created_at: string;
  listing_images: { url: string; position: number }[];
};

export default function MyListingsPage() {
  const supabase = createClient();
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setErr("Please log in.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("listings")
        .select(
          "id, title, price, image_url, condition, status, created_at, listing_images(url, position)"
        )
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });

      console.log({ data, error });
      if (error) setErr(error.message);
      else setItems((data as Listing[]) ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <p style={{ padding: 24 }}>Loading…</p>;
  if (err) return <p style={{ padding: 24 }}>Error: {err}</p>;

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>My listings</h1>
        <Link href="/listings/new">+ Sell something</Link>
      </div>

      {items.length === 0 ? (
        <p>You haven't listed anything yet.</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 16,
            marginTop: 16,
          }}
        >
          {items.map((l) => {
            const cover =
              l.image_url ??
              [...l.listing_images].sort((a, b) => a.position - b.position)[0]?.url;
            return (
              <Link
                key={l.id}
                href={`/listings/${l.id}`}
                style={{
                  border: "1px solid var(--dp-line)",
                  background: "var(--dp-soft)",
                  color: "var(--dp-fg)",
                  borderRadius: 12,
                  overflow: "hidden",
                  textDecoration: "none",
                }}
              >
                {cover && (
                  <img
                    src={cover}
                    alt={l.title}
                    style={{ width: "100%", aspectRatio: "1", objectFit: "cover" }}
                  />
                )}
                <div style={{ padding: 12 }}>
                  <strong>{l.title}</strong>
                  <div>₦{l.price.toLocaleString()}</div>
                  <small>{l.status}</small>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}