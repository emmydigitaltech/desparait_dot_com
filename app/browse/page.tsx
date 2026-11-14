import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { LISTING_SELECT, type Listing } from "@/lib/types";
import { catBySlug } from "@/lib/categories";
import CategoryChips from "@/components/CategoryChips";
import ListingGrid from "@/components/ListingGrid";

export default async function Browse({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string }>;
}) {
  const { q, cat } = await searchParams;

  await connection(); // must come before any Supabase call (same as the home page)

  const supabase = await createClient();

  let query = supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (cat) query = query.eq("category", cat);

  if (q) {
    const words = q
      .toLowerCase()
      .split(/\s+/)
      .map((w) => w.replace(/[^a-z0-9-]/g, ""))
      .filter(Boolean);

    // every search word must match the title or one of the tags
    for (const w of words) {
      query = query.or(`title.ilike.%${w}%,tags.cs.{${w}}`);
    }
  }

  const { data, error } = await query.limit(60);
  const items = (data ?? []) as unknown as Listing[];

  if (error) {
    console.error(
      `browse query failed | code=${error.code} | message=${error.message} | details=${error.details} | hint=${error.hint}`
    );
  }

  return (
    <>
      <h1 className="dp-h2" style={{ marginTop: 8 }}>
        {q ? `Results for “${q}”` : catBySlug(cat)?.label ?? "Browse all listings"}
      </h1>
      <CategoryChips active={cat} q={q} />
      <ListingGrid items={items} />
    </>
  );
}