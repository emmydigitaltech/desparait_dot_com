import Link from "next/link";
import { formatPrice, timeAgo } from "@/lib/utils";

export type ListingCardData = {
  id: string;
  title: string;
  price: number;
  created_at: string;
  boosted_until: string | null;
  listing_images: { image_url: string }[] | null;
  profiles: { is_verified: boolean } | null;
};

export default function ListingCard({ listing }: { listing: ListingCardData }) {
  const image = listing.listing_images?.[0]?.image_url;
  const boosted =
    listing.boosted_until && new Date(listing.boosted_until) > new Date();

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="block overflow-hidden rounded-xl border bg-white hover:shadow-md"
    >
      <div className="relative aspect-square bg-gray-100">
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={listing.title} className="h-full w-full object-cover" />
        )}
        {boosted && (
          <span className="absolute left-2 top-2 rounded bg-amber-400 px-2 py-0.5 text-xs font-medium">
            Featured
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="truncate font-medium">{listing.title}</p>
        <p className="font-semibold">{formatPrice(listing.price)}</p>
        <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
          {listing.profiles?.is_verified && (
            <span title="Verified seller" className="text-blue-600">✔ Verified</span>
          )}
          <span>{timeAgo(listing.created_at)}</span>
        </p>
      </div>
    </Link>
  );
}
