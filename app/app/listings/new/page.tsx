"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Category = { id: string; name: string };
const CONDITIONS = ["New", "Like new", "Good", "Fair"];
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
    category_id: "",
    condition: "Good",
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

      const [{ data: p }, { data: c }] = await Promise.all([
        supabase.from("profiles").select("school_id").eq("id", user.id).maybeSingle(),
        supabase.from("categories").select("id, name").order("name"),
      ]);
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
          school_id: schoolId,
          category_id: form.category_id,
          title: form.title.trim(),
          description: form.description.trim(),
          price: Number(form.price),
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
        rows.push({ listing_id: listing.id, image_url: data.publicUrl, position: i });
      }

      const { error: imgErr } = await supabase.from("listing_images").insert(rows);
      if (imgErr) throw imgErr;

      router.push(`/listings/${listing.id}`);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong.");
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg p-4">
      <h1 className="text-2xl font-bold">Sell something</h1>
      <form onSubmit={submit} className="mt-4 space-y-4">
        <input
          required
          placeholder="Title (e.g. Metal bed frame)"
          value={form.title}
          onChange={set("title")}
          className="w-full rounded-lg border p-2.5"
        />
        <textarea
          rows={4}
          placeholder="Description"
          value={form.description}
          onChange={set("description")}
          className="w-full rounded-lg border p-2.5"
        />
        <input
          required
          type="number"
          min="0"
          placeholder="Price in ₦"
          value={form.price}
          onChange={set("price")}
          className="w-full rounded-lg border p-2.5"
        />
        <select
          required
          value={form.category_id}
          onChange={set("category_id")}
          className="w-full rounded-lg border p-2.5"
        >
          <option value="">Category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={form.condition}
          onChange={set("condition")}
          className="w-full rounded-lg border p-2.5"
        >
          {CONDITIONS.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>

        <div>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, MAX_IMAGES))}
          />
          <p className="mt-1 text-xs text-gray-500">
            Up to {MAX_IMAGES} photos. {files.length} selected.
          </p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          disabled={saving || !schoolId}
          className="w-full rounded-lg bg-black p-3 font-medium text-white disabled:opacity-50"
        >
          {saving ? "Publishing..." : "Publish listing"}
        </button>
      </form>
    </main>
  );
}
