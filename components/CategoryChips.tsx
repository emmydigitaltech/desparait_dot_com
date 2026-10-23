import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";

export default function CategoryChips({ active, q }: { active?: string; q?: string }) {
  const href = (cat?: string) => {
    const p = new URLSearchParams();
    if (cat) p.set("cat", cat);
    if (q) p.set("q", q);
    const s = p.toString();
    return s ? `/browse?${s}` : "/browse";
  };
  return (
    <div className="dp-chips">
      <Link href={href()} className={`dp-chip${!active ? " on" : ""}`}>All</Link>
      {CATEGORIES.map((c) => (
        <Link key={c.slug} href={href(c.slug)} className={`dp-chip${active === c.slug ? " on" : ""}`}>
          {c.label}
        </Link>
      ))}
    </div>
  );
}
