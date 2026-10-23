import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";

export default function CategoryNav() {
  return (
    <nav className="dp-nav" aria-label="Categories">
      <Link href="/browse">All</Link>
      {CATEGORIES.map((c) => (
        <Link key={c.slug} href={`/browse?cat=${c.slug}`}>{c.label}</Link>
      ))}
    </nav>
  );
}
