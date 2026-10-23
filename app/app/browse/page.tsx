import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ListingCard, { ListingCardData } from "@/components/ListingCard";

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const { q, category } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id, schools(name)")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.school_id) redirect("/onboarding");

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, slug")
    .order("name");

  let query = supabase
    .from("listings")
    .select(
      "id, title, price, created_at, boosted_until, listing_images(image_url), profiles!seller_id(is_verified)"
    )
    .eq("school_id", profile.school_id)
    .eq("status", "active")
    .order("boosted_until", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (q) query = query.ilike("title", `%${q}%`);
  const activeCat = categories?.find((c) => c.slug === category);
  if (activeCat) query = query.eq("category_id", activeCat.id);

  const { data: listings } = await query;
  const schoolName = (profile.schools as any)?.name as string | undefined;

  return (
    <main className="mx-auto max-w-5xl p-4">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Browse</h1>
          {schoolName && <p className="text-sm text-gray-600">{schoolName}</p>}
        </div>
        <nav className="flex gap-2 text-sm">
          <Link href="/dashboard" className="rounded-lg border px-3 py-2">
            My listings
          </Link>
          <Link href="/listings/new" className="rounded-lg bg-black px-3 py-2 text-white">
            Sell something
          </Link>
        </nav>
      </header>

      <form className="mb-3 flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search listings"
          className="flex-1 rounded-lg border p-2.5"
        />
        {activeCat && <input type="hidden" name="category" value={activeCat.slug} />}
        <button className="rounded-lg border px-4">Search</button>
      </form>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 text-sm">
        <Link
          href="/browse"
          className={`whitespace-nowrap rounded-full border px-3 py-1 ${!activeCat ? "bg-black text-white" : ""}`}
        >
          All
        </Link>
        {categories?.map((c) => (
          <Link
            key={c.id}
            href={`/browse?category=${c.slug}`}
            className={`whitespace-nowrap rounded-full border px-3 py-1 ${activeCat?.id === c.id ? "bg-black text-white" : ""}`}
          >
            {c.name}
          </Link>
        ))}
      </div>

      {!listings?.length ? (
        <p className="py-12 text-center text-gray-500">
          Nothing here yet. Be the first to list something.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {(listings as unknown as ListingCardData[]).map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}
    </main>
  );
}
