import type { Listing } from "@/lib/types";
import ListingCard from "./ListingCard";

export default function ListingGrid({ items }: { items: Listing[] }) {
  if (!items.length)
    return <p className="dp-empty">No listings found. Try another search or category.</p>;
  return (
    <div className="dp-grid">
      {items.map((l) => (
        <ListingCard key={l.id} listing={l} />      ))}
    </div>
  );
}
