import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL, formatPrice, timeAgo, whatsappLink } from "@/lib/utils";

export default async function ListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: listing } = await supabase
    .from("listings")
    .select(
      "id, title, description, price, condition, status, created_at, seller_id, categories(name), listing_images(image_url, position), profiles!seller_id(full_name, whatsapp, is_verified)"
    )
    .eq("id", id)
    .maybeSingle();

  if (!listing) notFound();

  const seller = listing.profiles as any;
  const images = [...((listing.listing_images as any[]) ?? [])].sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0)
  );
  const message = `Hi, I'm interested in "${listing.title}" (${formatPrice(listing.price)}) on Despariat: ${SITE_URL}/listings/${listing.id}`;
  const sold = listing.status === "sold";

  return (
    <main className="mx-auto max-w-2xl p-4">
      <Link href="/browse" className="text-sm text-gray-600 hover:underline">
        ← Back to browse
      </Link>

      <div className="mt-3 grid gap-2">
        {images.map((img) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={img.image_url}
            src={img.image_url}
            alt={listing.title}
            className="w-full rounded-xl object-cover"
          />
        ))}
      </div>

      <h1 className="mt-4 text-2xl font-bold">{listing.title}</h1>
      <p className="text-xl font-semibold">{formatPrice(listing.price)}</p>
      <p className="mt-1 text-sm text-gray-500">
        {(listing.categories as any)?.name} · {listing.condition} ·{" "}
        {timeAgo(listing.created_at)}
      </p>

      {listing.description && (
        <p className="mt-4 whitespace-pre-line text-gray-800">{listing.description}</p>
      )}

      <div className="mt-6 flex items-center justify-between rounded-xl border p-3">
        <div>
          <p className="font-medium">{seller?.full_name ?? "Seller"}</p>
          {seller?.is_verified ? (
            <p className="text-sm text-blue-600">✔ Verified student</p>
          ) : (
            <p className="text-sm text-gray-500">Not verified yet</p>
          )}
        </div>
        {sold ? (
          <span className="rounded-lg bg-gray-200 px-4 py-2 text-sm">Sold</span>
        ) : seller?.whatsapp ? (
          <a
            href={whatsappLink(seller.whatsapp, message)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-green-600 px-5 py-2.5 font-medium text-white hover:bg-green-700"
          >
            Buy on WhatsApp
          </a>
        ) : (
          <span className="text-sm text-gray-500">No contact available</span>
        )}
      </div>
    </main>
  );
}
