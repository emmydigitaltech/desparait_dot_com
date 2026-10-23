// Slugs must match the values stored in listings.category in your database.
export const CATEGORIES = [
  { slug: "hostel", label: "Hostel & room", emoji: "🛏️" },
  { slug: "services", label: "Services", emoji: "🛠️" },
  { slug: "phones", label: "Phones & electronics", emoji: "📱" },
  { slug: "textbooks", label: "Textbooks", emoji: "📚" },
  { slug: "fashion", label: "Fashion & shoes", emoji: "👟" },
  { slug: "food", label: "Food & snacks", emoji: "🍟" },
  { slug: "past-questions", label: "Past questions", emoji: "📝" },
  { slug: "printing", label: "Printing", emoji: "🖨️" },
  { slug: "supplies", label: "School supplies", emoji: "✏️" },
] as const;

export const catBySlug = (slug?: string | null) =>
  CATEGORIES.find((c) => c.slug === slug);
