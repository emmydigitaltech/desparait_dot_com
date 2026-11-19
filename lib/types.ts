// Edit this one file if your column names differ.
export type Listing = {
  id: string;
  title: string;
  price: number;
  original_price: number | null;
  category: string | null;
  image_url: string | null;
  boosted_until?: string | null;
  rating_avg?: number | null;
  rating_count?: number | null;
  seller: { full_name: string | null; is_verified: boolean | null } | null;
  school?: { name: string } | null;
};

// If the join fails, name the foreign key: seller:profiles!listings_seller_id_fkey(...)
export const LISTING_SELECT =
  "id,title,price,original_price,category,image_url,boosted_until,rating_avg,rating_count,seller:profiles(full_name,is_verified),school:schools(name)";