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

  const [latestRes, rankRes] = await Promise.all([
    // Browse-all grid: newest 16
    supabase
      .from("listings")
      .select(LISTING_SELECT)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(16),
    // Trending: ranked ids from the view (likes, reviews, sales)
    supabase
      .from("trending_listings")
      .select("id")
      .order("score", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  if (latestRes.error) {
    console.error(
      "Home listings error:",
      latestRes.error.code,
      latestRes.error.message,
      latestRes.error.details,
      latestRes.error.hint
    );
  }
  if (rankRes.error) {
    console.error("Trending rank error:", rankRes.error.code, rankRes.error.message);
  }

  const nowIso = new Date().toISOString();
  const { data: boostedData } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("status", "active")
    .gt("boosted_until", nowIso)
    .order("boosted_until", { ascending: false })
    .limit(4); // cap so paid items don't flood the feed

  const boosted = (boostedData ?? []) as unknown as Listing[];
  const boostedIds = new Set(boosted.map((b) => b.id));
  const items = [
    ...boosted,
    ...((latestRes.data ?? []) as unknown as Listing[]).filter((l) => !boostedIds.has(l.id)),
  ].slice(0, 16);

  // Load the ranked listings with the normal select, then restore rank order
  let trending: Listing[] = items.slice(0, 10); // fallback: newest 10
  const rankedIds = (rankRes.data ?? []).map((r: { id: string }) => r.id);

  if (rankedIds.length > 0) {
    const { data: rankedRows, error: rankedErr } = await supabase
      .from("listings")
      .select(LISTING_SELECT)
      .eq("status", "active")
      .in("id", rankedIds);

    if (rankedErr) {
      console.error("Trending listings error:", rankedErr.code, rankedErr.message);
    } else {
      const byId = new Map(
        ((rankedRows ?? []) as unknown as Listing[]).map((l) => [l.id, l])
      );
      const ordered = rankedIds
        .map((id) => byId.get(id))
        .filter((l): l is Listing => Boolean(l));
      if (ordered.length > 0) trending = ordered;
    }
  }
  trending = [...boosted, ...trending.filter((l) => !boostedIds.has(l.id))].slice(0, 10);

  return (
    <>
      <h2 className="dp-h2">Trending on campus</h2>
      <div className="dp-trending">
        {trending.map((l) => (
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

      <section className="dp-cta">
        <div>
          <h3>Got something to sell?</h3>
          <span className="dp-meta">List it in minutes and reach thousands of students.</span>
        </div>
        <Link href="/listings/new" className="dp-btn">Start selling</Link>
      </section>
    </>
  );
}