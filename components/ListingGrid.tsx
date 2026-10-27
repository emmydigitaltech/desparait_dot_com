import ListingCard from "./ListingCard";

export default function ListingGrid({ items }: { items: any[] }) {
  if (!items.length)
    return <p className="dp-meta">No listings found. Try another search or category.</p>;

  return (
    <div className="dp-lgrid">
      {items.map((l) => (
        <ListingCard key={l.id} listing={l} />
      ))}
    </div>
  );
}