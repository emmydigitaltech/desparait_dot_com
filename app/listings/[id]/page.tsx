"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import VerifiedBadge from "@/components/VerifiedBadge";
import LikeButton from "@/components/LikeButton";
import SellerReviews from "@/components/SellersReviews";
import AddToCartButton from "@/components/AddToCartButton";
import StartChatButton from "@/components/StartChatButton";
import ReportButton from "@/components/ReportButton";

type Listing = {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  price: number;
  original_price: number | null;
  category: string | null;
  image_url: string | null;
  condition: string | null;
  status: string;
  review_note: string | null;
  created_at: string;
  school: { name: string } | null;
};

type Seller = {
  full_name: string | null;
  is_verified: boolean | null;
};

const CONDITION_LABELS: Record<string, string> = {
  new: "New",
  like_new: "Like new",
  good: "Good",
  fair: "Fair",
};

export default function ListingDetailPage() {
  const supabase = createClient();
  const { id } = useParams<{ id: string }>();

  const [listing, setListing] = useState<Listing | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [active, setActive] = useState(0);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setMeId(user?.id ?? null);

      const { data: l, error: lErr } = await supabase
        .from("listings")
        .select("id, seller_id, title, description, price, original_price, category, image_url, condition, status, review_note, created_at, school:schools(name)")
        .eq("id", id)
        .maybeSingle();

      if (lErr) {
        setError(lErr.message);
        setLoading(false);
        return;
      }
      if (!l) {
        setLoading(false);
        return;
      }
      setListing(l as unknown as Listing);

      const [{ data: imgs }, { data: p }] = await Promise.all([
        supabase.from("listing_images").select("url, position").eq("listing_id", id).order("position"),
        supabase.from("profiles").select("full_name, is_verified").eq("id", l.seller_id).maybeSingle(),
      ]);

      const urls = (imgs ?? []).map((i) => i.url);
      setImages(urls.length ? urls : l.image_url ? [l.image_url] : []);
      setSeller((p as Seller) ?? null);
      setLoading(false);
    })();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <main className="dp-listing"><p className="dp-listing-muted">Loading...</p></main>;

  if (error)
    return (
      <main className="dp-listing">
        <p className="dp-listing-error">Could not load listing: {error}</p>
      </main>
    );

  if (!listing)
    return (
      <main className="dp-listing">
        <p className="dp-listing-muted">Listing not found.</p>
        <Link href="/" className="dp-listing-back">← Back to browse</Link>
      </main>
    );

  const canReport = !!meId && meId !== listing.seller_id;
  const schoolName = listing.school?.name ?? null;
  const next = encodeURIComponent(`/listings/${listing.id}`);

  return (
    <main className="dp-listing">
      <Link href="/" className="dp-listing-back">← Back to browse</Link>

      <div className="dp-listing-grid">
        <section className="dp-listing-gallery">
          {images.length ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="dp-listing-main" src={images[active]} alt={listing.title} />
          ) : (
            <div className="dp-listing-main dp-listing-empty">No photo</div>
          )}
          {images.length > 1 && (
            <div className="dp-listing-thumbs">
              {images.map((u, i) => (
                <button
                  key={u}
                  type="button"
                  className={i === active ? "is-active" : ""}
                  onClick={() => setActive(i)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u} alt="" />
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="dp-listing-info">
          <h1>{listing.title}</h1>

          <p className="dp-listing-price">
            ₦{listing.price.toLocaleString()}
            {listing.original_price ? (
              <span className="dp-listing-was">₦{listing.original_price.toLocaleString()}</span>
            ) : null}
          </p>

          <div className="dp-listing-tags">
            {schoolName && <span>📍 {schoolName}</span>}
            {listing.condition && (
              <span>{CONDITION_LABELS[listing.condition] ?? listing.condition}</span>
            )}
            {listing.category && <span>{listing.category.replace(/-/g, " ")}</span>}
            {listing.status !== "active" && <span>{listing.status}</span>}
          </div>

          <div style={{ margin: "10px 0" }}>
            <LikeButton listingId={listing.id} />
          </div>

          {listing.description && <p className="dp-listing-desc">{listing.description}</p>}

          <div className="dp-listing-seller">
            <p className="dp-listing-muted">
              Seller{schoolName ? ` · located at ${schoolName}` : ""}
            </p>
            <Link
              href={`/sellers/${listing.seller_id}`}
              className="dp-link"
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              {seller?.full_name ?? "Student seller"}
              {seller?.is_verified && <VerifiedBadge size={16} />}
            </Link>
            <p className="dp-listing-muted" style={{ fontSize: 13, marginTop: 2 }}>
              View profile →
            </p>
          </div>

          {listing.status === "active" ? (
            meId ? (
              <div className="dp-actions">
                <AddToCartButton listingId={listing.id} />
                <StartChatButton
                  listingId={listing.id}
                  sellerId={listing.seller_id}
                  className="dp-listing-cta"
                />
              </div>
            ) : (
              <div className="dp-panel" style={{ marginTop: 12 }}>
                <p style={{ margin: "0 0 10px" }}>
                  {schoolName
                    ? `This item is sold by a student at ${schoolName}. Only ${schoolName} students can buy it. Create an account and choose ${schoolName} as your university to add it to your cart or message the seller.`
                    : "Create an account to add this item to your cart or message the seller."}
                </p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Link href={`/signup?next=${next}`} className="dp-btn">Create account</Link>
                  <Link href={`/login?next=${next}`} className="dp-btn-o">Sign in</Link>
                </div>
              </div>
            )
          ) : (
            <p className="dp-listing-muted">
              {listing.status === "pending" && "Pending approval. Only you can see this listing."}
              {listing.status === "rejected" &&
                `This listing was rejected${listing.review_note ? `: ${listing.review_note}` : "."}`}
              {listing.status === "sold" && "This item has been sold."}
            </p>
          )}

          {canReport && (
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 14 }}>
              <ReportButton type="listing" targetId={listing.id} />
              <ReportButton type="user" targetId={listing.seller_id} />
            </div>
          )}
        </section>
      </div>

      <SellerReviews sellerId={listing.seller_id} listingId={listing.id} />
    </main>
  );
}