import Link from "next/link";

export type CardListing = {
  id: string;
  title: string;
  price: number;
  original_price: number | null;
  image_url: string | null;
  condition?: string | null;
  category: string | null;
  seller?: { full_name: string | null; is_verified: boolean | null } | null;
};

const CONDITION_LABEL: Record<string, string> = {
  new: "New",
  like_new: "Like new",
  good: "Good",
  fair: "Fair",
};

export default function ListingCard({ listing }: { listing: CardListing }) {
  const { id, title, price, original_price, image_url, condition, seller } = listing;
  const off =
    original_price && original_price > price
      ? Math.round((1 - price / original_price) * 100)
      : 0;

  return (
    <Link href={`/listings/${id}`} className="dp-lc">
      <div className="dp-lc-img">
        {image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image_url} alt={title} loading="lazy" />
        ) : (
          <span className="dp-lc-noimg">No photo</span>
        )}
        {off > 0 && <span className="dp-lc-off">-{off}%</span>}
      </div>
      <div className="dp-lc-body">
        <p className="dp-lc-title">{title}</p>
        <p className="dp-lc-price">₦{price.toLocaleString()}</p>
        {off > 0 && <p className="dp-lc-old">₦{original_price!.toLocaleString()}</p>}
        <p className="dp-lc-meta">
          {condition ? CONDITION_LABEL[condition] ?? condition : ""}
          {seller?.is_verified ? " · ✔ Verified" : ""}
        </p>
      </div>
    </Link>
  );
}