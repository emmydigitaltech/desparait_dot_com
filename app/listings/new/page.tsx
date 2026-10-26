"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Category = { slug: string; label: string; emoji: string | null };

// value must match listings_condition_check in the DB
const CONDITIONS = [
  { value: "new", label: "New" },
  { value: "like_new", label: "Like new" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
];

const MAX_IMAGES = 4;

export default function NewListingPage() {
  const supabase = createClient();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [schoolId, setSchoolId] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    category: "",
    condition: "good",
  });
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return router.replace("/");

      const [{ data: p }, { data: c, error: catErr }] = await Promise.all([
        supabase.from("profiles").select("school_id").eq("id", user.id).maybeSingle(),
        supabase.from("categories").select("slug, label, emoji").order("sort_order"),
      ]);
      if (catErr) setError("Could not load categories: " + catErr.message);
      if (!p?.school_id) return router.replace("/onboarding");
      setSchoolId(p.school_id);
      setCategories(c ?? []);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k: string) => (e: React.ChangeEvent<any>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!files.length) return setError("Add at least one photo.");
    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Please sign in again.");

      const { data: listing, error: insertErr } = await supabase
        .from("listings")
        .insert({
          seller_id: user.id,
          category: form.category,
          title: form.title.trim(),
          description: form.description.trim(),
          price: Math.round(Number(form.price)),
          condition: form.condition,
          status: "active",
        })
        .select("id")
        .single();
      if (insertErr) throw insertErr;

      const rows = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `${user.id}/${listing.id}-${i}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("listing-images")
          .upload(path, file, { contentType: file.type });
        if (upErr) throw upErr;
        const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
        rows.push({ listing_id: listing.id, url: data.publicUrl, position: i });
      }

      const { error: imgErr } = await supabase.from("listing_images").insert(rows);
      if (imgErr) throw imgErr;

      // cover photo used by the browse page
      await supabase.from("listings").update({ image_url: rows[0].url }).eq("id", listing.id);

      router.push(`/listings/${listing.id}`);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong.");
      setSaving(false);
    }
  }

  return (
    <main className="dp-sell">
      <form onSubmit={submit} className="dp-sell-card">
        <h1>Sell something</h1>

        <input
          required
          placeholder="Title (e.g. Metal bed frame)"
          value={form.title}
          onChange={set("title")}
        />
        <textarea
          rows={4}
          placeholder="Description"
          value={form.description}
          onChange={set("description")}
        />
        <input
          required
          type="number"
          min="0"
          placeholder="Price in ₦"
          value={form.price}
          onChange={set("price")}
        />
        <select required value={form.category} onChange={set("category")}>
          <option value="">Category</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.emoji ? `${c.emoji} ` : ""}
              {c.label}
            </option>
          ))}
        </select>
        <select value={form.condition} onChange={set("condition")}>
          {CONDITIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>

        <div>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) =>
              setFiles(Array.from(e.target.files ?? []).slice(0, MAX_IMAGES))
            }
          />
          <p className="dp-sell-hint">
            Up to {MAX_IMAGES} photos. {files.length} selected.
          </p>
        </div>

        {error && <p className="dp-sell-error">{error}</p>}

        <button className="dp-sell-btn" disabled={saving || !schoolId}>
          {saving ? "Publishing..." : "Publish listing"}
        </button>
      </form>
    </main>
  );
}