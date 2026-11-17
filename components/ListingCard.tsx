import Link from "next/link";
import VerifiedBadge from "@/components/VerifiedBadge";
import QuickAddButton from "@/components/QuickAddButton";

export type CardListing = {
  id: string;
  title: string;
  price: number;
  original_price: number | null;
  image_url: string | null;
  condition?: string | null;
  category: string | null;
  boosted_until?: string | null;
  seller?: {
    full_name: string | null;
    is_verified: boolean | null;
    rating_avg?: number | null;
    rating_count?: number | null;
  } | null;
};

const CONDITION_LABEL: Record<string, string> = {
  new: "New",
  like_new: "Like new",
  good: "Good",
  fair: "Fair",
};

function Stars({ rating }: { rating: number }) {
  const pct = Math.max(0, Math.min(100, (rating / 5) * 100));
  return (
    <span className="dp-stars" role="img" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      <span className="dp-stars-fill" style={{ width: `${pct}%` }}>★★★★★</span>
      ★★★★★
    </span>
  );
}

export default function ListingCard({ listing }: { listing: CardListing }) {
  const {
    id, title, price, original_price, image_url, condition,
    seller, boosted_until,
  } = listing;
  const off =
    original_price && original_price > price
      ? Math.round((1 - price / original_price) * 100)
      : 0;
  const promoted = !!boosted_until && new Date(boosted_until).getTime() > Date.now();

  return (
    <div className="dp-lc-wrap">
      <Link href={`/listings/${id}`} className="dp-lc">
        <div className="dp-lc-img">
          {image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image_url} alt={title} loading="lazy" />
          ) : (
            <span className="dp-lc-noimg">No photo</span>
          )}
          {off > 0 && <span className="dp-lc-off">-{off}%</span>}
          {promoted && <span className="dp-lc-promo">Sponsored</span>}
        </div>
        <div className="dp-lc-body">
          <p className="dp-lc-price">
            <span className="dp-lc-amt">
              <span className="dp-lc-cur">₦</span>
              {price.toLocaleString()}
            </span>
            {off > 0 && <s className="dp-lc-old">₦{original_price!.toLocaleString()}</s>}
          </p>
          <p className="dp-lc-title">{title}</p>
          <p className="dp-lc-rate">
            <Stars rating={Number(seller?.rating_avg ?? 0)} />
            <span>{Number(seller?.rating_count ?? 0).toLocaleString()}</span>
          </p>
          <p
            className="dp-lc-meta"
            style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "nowrap" }}
          >
            {condition ? CONDITION_LABEL[condition] ?? condition : ""}
            {seller?.is_verified && (
              <>
                {condition ? <span>·</span> : null}
                <VerifiedBadge size={14} />
                <span>Verified</span>
              </>
            )}
          </p>
        </div>
      </Link>
      <QuickAddButton listingId={id} />
    </div>
  );
}