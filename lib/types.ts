export type Listing = {
  id: string;
  title: string;
  price: number;
  original_price: number | null;
  category: string | null;
  image_url: string | null;
  condition: "new" | "like_new" | "good" | "fair" | null;
  created_at: string;
  seller: { full_name: string | null; is_verified: boolean | null } | null;
};

export const LISTING_SELECT =
  "id, title, price, original_price, category, image_url, condition, created_at, seller:profiles!listings_seller_id_fkey(full_name, is_verified)";