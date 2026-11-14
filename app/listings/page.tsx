import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { LISTING_SELECT } from "@/lib/types";
import BoostButton from "@/components/BoostButton";

type MyListing = {
  id: string;
  title: string;
  price: number;
  image_url: string | null;
  category: string | null;
  status: string;
  boosted_until: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  active: "Live",
  sold: "Sold",
  pending: "Awaiting approval",
};

async function MyListings() {
  await connection(); // must come before any Supabase call

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login"); // change if your sign-in route is different

  const { data, error } = await supabase
    .from("listings")
    .select(`${LISTING_SELECT}, status, boosted_until`)
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("My listings error:", error.code, error.message, error.details, error.hint);
  }

  const items = (data ?? []) as unknown as MyListing[];

  if (items.length === 0) {
    return (
      <div className="dp-my-empty">
        <p>You haven&apos;t listed anything yet.</p>
        <Link href="/listings/new" className="dp-btn">
          Sell something
        </Link>
      </div>
    );
  }

  const now = Date.now();

  return (
    <div className="dp-my-list">
      {items.map((l) => {
        const boosted = !!l.boosted_until && new Date(l.boosted_until).getTime() > now;
        return (
          <div key={l.id} className="dp-my-row">
            <Link href={`/listings/${l.id}`} className="dp-my-thumb">
              {l.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={l.image_url} alt={l.title} loading="lazy" />
              ) : (
                <span>No photo</span>
              )}
            </Link>

            <div className="dp-my-info">
              <Link href={`/listings/${l.id}`} className="dp-my-title">
                {l.title}
              </Link>
              <p className="dp-my-price">₦{Number(l.price).toLocaleString()}</p>
              <p className="dp-my-meta">
                <span className={`dp-my-status dp-my-status-${l.status}`}>
                  {STATUS_LABEL[l.status] ?? l.status}
                </span>
                {boosted && (
                  <span className="dp-my-boosted">
                    Boosted until {new Date(l.boosted_until!).toLocaleDateString()}
                  </span>
                )}
              </p>
            </div>

            <div className="dp-my-actions">
              <Link href={`/listings/${l.id}/edit`} className="dp-btn-o">
                Edit
              </Link>
              {l.status === "active" && <BoostButton listingId={l.id} />}
              {/* Mark sold: drop in <MarkSoldButton ... /> with the same props your dashboard uses */}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function MyListingsPage() {
  return (
    <>
      <div className="dp-my-head">
        <h1 className="dp-h2" style={{ margin: 0 }}>
          My listings
        </h1>
        <Link href="/listings/new" className="dp-btn">
          New listing
        </Link>
      </div>
      <Suspense fallback={<div className="dp-listings-skeleton" />}>
        <MyListings />
      </Suspense>
    </>
  );
}