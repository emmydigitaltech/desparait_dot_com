"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import VerifiedBadge from "@/components/VerifiedBadge";

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
  created_at: string;
};

type Seller = {
  full_name: string | null;
  whatsapp: string | null;
  is_verified: boolean | null;
};

const CONDITION_LABELS: Record<string, string> = {
  new: "New",
  like_new: "Like new",
  good: "Good",
  fair: "Fair",
};

function waLink(raw: string, title: string) {
  let n = raw.replace(/\D/g, "");
  if (n.startsWith("0")) n = "234" + n.slice(1);
  const text = encodeURIComponent(`Hi, I'm interested in "${title}" on Despariat.`);
  return `https://wa.me/${n}?text=${text}`;
}

export default function ListingDetailPage() {
  const supabase = createClient();
  const { id } = useParams<{ id: string }>();

  const [listing, setListing] = useState<Listing | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [active, setActive] = useState(0);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const { data: l, error: lErr } = await supabase
        .from("listings")
        .select("id, seller_id, title, description, price, original_price, category, image_url, condition, status, created_at")
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
      setListing(l as Listing);

      const [{ data: imgs }, { data: p }] = await Promise.all([
        supabase.from("listing_images").select("url, position").eq("listing_id", id).order("position"),
        supabase.from("profiles").select("full_name, whatsapp, is_verified").eq("id", l.seller_id).maybeSingle(),
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
            {listing.condition && (
              <span>{CONDITION_LABELS[listing.condition] ?? listing.condition}</span>
            )}
            {listing.category && <span>{listing.category.replace(/-/g, " ")}</span>}
            {listing.status !== "active" && <span>{listing.status}</span>}
          </div>

          {listing.description && <p className="dp-listing-desc">{listing.description}</p>}

          <div className="dp-listing-seller">
            <p className="dp-listing-muted">Seller</p>
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

          {seller?.whatsapp ? (
            <a
              className="dp-listing-cta"
              href={waLink(seller.whatsapp, listing.title)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Chat on WhatsApp
            </a>
          ) : (
            <p className="dp-listing-muted">Seller contact unavailable.</p>
          )}
        </section>
      </div>
    </main>
  );
}