import Link from "next/link";
import type { Listing } from "@/lib/types";
import { catBySlug } from "@/lib/categories";
import { naira } from "@/lib/format";
import VerifiedBadge from "./VerifiedBadge";

export default function ListingCard({ l }: { l: Listing }) {
  const cat = catBySlug(l.category);
  const off =
    l.original_price && l.original_price > l.price
      ? Math.round((1 - l.price / l.original_price) * 100)
      : 0;
  return (
    <Link href={`/listings/${l.id}`} className="dp-card">
      <div className="dp-img">
        {l.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={l.image_url} alt={l.title} loading="lazy" />
        ) : (
          <span aria-hidden>{cat?.emoji ?? "🛍️"}</span>
        )}
        {off > 0 && <span className="dp-off">-{off}%</span>}
      </div>
      <div className="dp-ttl">{l.title}</div>
      <div className="dp-pr">
        {naira(l.price)}
        {off > 0 && <s>{naira(l.original_price!)}</s>}
      </div>
      <div className="dp-meta">
        📍 <b>Meet on campus</b> · inspect first
      </div>
      <div className="dp-sel">
        Sold by {l.seller?.full_name ?? "Student seller"}
        {l.seller?.is_verified && <VerifiedBadge />}
      </div>
      <span className="dp-btn">View listing</span>
    </Link>
  );
}
