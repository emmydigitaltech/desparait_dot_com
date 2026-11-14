import ListingCard from "./ListingCard";
import QuickAddButton from "./QuickAddButton";

export default function ListingCardQuick({ listing }: { listing: any }) {
  return (
    <div className="dp-qwrap">
      <ListingCard listing={listing} />
      <QuickAddButton listingId={listing.id} />
    </div>
  );
}