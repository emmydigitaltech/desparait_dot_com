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
  const supabase = await createClient();

  let query = supabase
    .from("listings")
    .select(LISTING_SELECT)
    .order("created_at", { ascending: false });
  if (cat) query = query.eq("category", cat);
  if (q) query = query.ilike("title", `%${q.replace(/[%_]/g, "")}%`);

  const { data } = await query.limit(60);
  const items = (data ?? []) as unknown as Listing[];

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
