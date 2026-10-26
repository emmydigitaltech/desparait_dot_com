import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { LISTING_SELECT, type Listing } from "@/lib/types";
import { CATEGORIES } from "@/lib/categories";
import HeroCarousel from "@/components/HeroCarousel";
import SafetyStrip from "@/components/SafetyStrip";
import CategoryChips from "@/components/CategoryChips";
import ListingCard from "@/components/ListingCard";
import ListingGrid from "@/components/ListingGrid";

async function HomeListings() {
  await connection(); // must come before any Supabase call

  const supabase = await createClient();
  const { data } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .order("created_at", { ascending: false })
    .limit(16);
  const items = (data ?? []) as unknown as Listing[];

  return (
    <>
      {/* "Trending" = newest for now. Swap the order for views/sales if you track them. */}
      <h2 className="dp-h2">Trending on campus</h2>
      <div className="dp-row-scroll">
        {items.slice(0, 7).map((l) => (
          <ListingCard key={l.id} listing={l} />
        ))}
      </div>

      <h2 className="dp-h2" id="all">Browse all listings</h2>
      <CategoryChips />
      <ListingGrid items={items} />
      <p style={{ marginTop: 12 }}>
        <Link href="/browse" className="dp-btn-o">See all listings</Link>
      </p>
    </>
  );
}

function ListingsSkeleton() {
  return (
    <>
      <h2 className="dp-h2">Trending on campus</h2>
      <div className="dp-listings-skeleton" />
    </>
  );
}

export default function Home() {
  return (
    <>
      <HeroCarousel />
      <SafetyStrip />

      <h2 className="dp-h2">Shop by category</h2>
      <div className="dp-cats">
        {CATEGORIES.map((c) => (
          <Link key={c.slug} href={`/browse?cat=${c.slug}`} className="dp-cat">
            <span aria-hidden>{c.emoji}</span>
            {c.label}
          </Link>
        ))}
      </div>

      <Suspense fallback={<ListingsSkeleton />}>
        <HomeListings />
      </Suspense>

      <section className="dp-sell">
        <div>
          <h3>Got something to sell?</h3>
          <span className="dp-meta">Get a verified seller tick and reach thousands of students.</span>
        </div>
        <Link href="/verify" className="dp-btn">Start selling</Link>
      </section>
    </>
  );
}