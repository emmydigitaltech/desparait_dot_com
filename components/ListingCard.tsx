import Link from "next/link";
import type { Listing } from "@/lib/types";
import { catBySlug } from "@/lib/categories";
import { naira } from "@/lib/format";
import VerifiedBadge from "./VerifiedBadge";

export type CardListing = {
  id: string;
  title: string;
  price: number;
  original_price: number | null;
  image_url: string | null;
  condition: string | null;
  category: string | null;
};

const CONDITION_LABEL: Record<string, string> = {
  new: "New",
  like_new: "Like new",
  good: "Good",
  fair: "Fair",
};

export default function ListingCard({ listing }: { listing: CardListing }) {
  const { id, title, price, original_price, image_url, condition } = listing;
  return (
    <Link href={`/listings/${id}`} className="dp-card">
      <div className="dp-card-img">
        {image_url ? (
          <img src={image_url} alt={title} loading="lazy" />
        ) : (
          <span className="dp-card-noimg">No photo</span>
        )}
      </div>
      <div className="dp-card-body">
        <div className="dp-card-title">{title}</div>
        <div className="dp-card-price">
          ₦{price.toLocaleString()}
          {original_price && original_price > price && (
            <s className="dp-card-old">₦{original_price.toLocaleString()}</s>
          )}
        </div>
        {condition && (
          <span className="dp-card-tag">{CONDITION_LABEL[condition] ?? condition}</span>
        )}
      </div>
    </Link>
  );
}