"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getCompletion, MIN_TO_SELL, type MissingItem } from "@/lib/completion";
import Splash from "@/components/Splash";

type Category = { slug: string; label: string; emoji: string | null };

// value must match listings_condition_check in the DB
const CONDITIONS = [
  { value: "new", label: "New" },
  { value: "like_new", label: "Like new" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
];

const MIN_IMAGES = 4;
const MAX_IMAGES = 10;
const MAX_TAGS = 15;
const MAX_STOCK = 9999;
const LIMIT_MSG =
  "You can post 3 listings per 24 hours until your account is verified. Get verified to remove this limit.";

function mergeTags(prev: string[], raw: string) {
  const parts = raw
    .toLowerCase()
    .split(/[\s,]+/)
    .map((t) => t.replace(/[^a-z0-9-]/g, "").slice(0, 30))
    .filter(Boolean);
  return Array.from(new Set([...prev, ...parts])).slice(0, MAX_TAGS);
}

export default function NewListingPage() {
  const supabase = createClient();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [block, setBlock] = useState<{ pct: number; missing: MissingItem[] } | null>(null);
  const [noBank, setNoBank] = useState(false);
  const [done, setDone] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [schoolId, setSchoolId] = useState("");
  // null = no limit (verified or admin)
  const [left, setLeft] = useState<number | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    stock: "1",
    category: "",
    condition: "good",
  });
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return router.replace("/");

      const [{ data: p }, { data: c, error: catErr }, { count: bankCount }, { data: leftData }] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("school_id, full_name, avatar_url, phone, campus, is_verified")
            .eq("id", user.id)
            .maybeSingle(),
          supabase.from("categories").select("slug, label, emoji").order("sort_order"),
          // RLS only returns the caller's own row
          supabase.from("seller_bank_details").select("*", { count: "exact", head: true }),
          supabase.rpc("listings_left_today"),
        ]);
      if (catErr) setError("Could not load categories: " + catErr.message);
      if (!p?.school_id) return router.replace("/onboarding");

      const completion = getCompletion(p);
      if (!completion.canSell) setBlock({ pct: completion.pct, missing: completion.missing });
      setNoBank(!bankCount);
      setLeft(typeof leftData === "number" ? leftData : null);

      setSchoolId(p.school_id);
      setCategories(c ?? []);
      setChecking(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k: string) => (e: React.ChangeEvent<any>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  function addFiles(list: FileList | null) {
    const picked = Array.from(list ?? []);
    setFiles((prev) => [...prev, ...picked].slice(0, MAX_IMAGES));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (left === 0) return setError(LIMIT_MSG);
    if (files.length < MIN_IMAGES)
      return setError(`Add at least ${MIN_IMAGES} photos (you have ${files.length}).`);

    const stock = Math.floor(Number(form.stock));
    if (!Number.isFinite(stock) || stock < 1 || stock > MAX_STOCK)
      return setError(`Enter how many are in stock (1 to ${MAX_STOCK}).`);

    setSaving(true);

    let listingId: string | null = null;
    const uploaded: string[] = [];

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
          stock,
          condition: form.condition,
          tags: mergeTags(tags, tagInput),
          status: "pending", // the database forces this anyway
        })
        .select("id")
        .single();
      if (insertErr) throw insertErr;
      listingId = listing.id;

      const rows = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `${user.id}/${listing.id}-${i}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("listing-images")
          .upload(path, file, { contentType: file.type });
        if (upErr) throw upErr;
        uploaded.push(path);
        const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
        rows.push({ listing_id: listing.id, url: data.publicUrl, position: i });
      }

      const { error: imgErr } = await supabase.from("listing_images").insert(rows);
      if (imgErr) throw imgErr;

      // cover photo used by the browse page
      await supabase.from("listings").update({ image_url: rows[0].url }).eq("id", listing.id);

      if (left !== null) setLeft(Math.max(0, left - 1));
      setDone(true);
      setSaving(false);
    } catch (err: any) {
      // don't leave a half-made listing behind
      if (uploaded.length) await supabase.storage.from("listing-images").remove(uploaded);
      if (listingId) await supabase.from("listings").delete().eq("id", listingId);

      if (String(err?.message ?? "").includes("daily_listing_limit")) {
        setLeft(0);
        setError(LIMIT_MSG);
      } else {
        setError(err.message ?? "Something went wrong.");
      }
      setSaving(false);
    }
  }

  if (checking) return <Splash />;

  if (block) {
    return (
      <main className="dp-sell">
        <div className="dp-sell-card">
          <h1>Complete your profile to start selling</h1>
          <p className="dp-sell-error">
            Your profile is {block.pct}% complete. It must be above {MIN_TO_SELL}% before you can list a product.
          </p>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14 }}>
            {block.missing.map((m) => (
              <li key={m.key}>
                {m.label} (+{m.points}%)
              </li>
            ))}
          </ul>
          <Link
            href="/dashboard"
            className="dp-sell-btn"
            style={{ textAlign: "center", textDecoration: "none" }}
          >
            Go to my dashboard
          </Link>
        </div>
      </main>
    );
  }

  if (noBank) {
    return (
      <main className="dp-sell">
        <div className="dp-sell-card">
          <h1>Add your payout account first</h1>
          <p className="dp-sell-hint">
            Buyers need your bank details to pay you after they inspect the item. Save your account, then come back to list.
          </p>
          <Link
            href="/settings/bank"
            className="dp-sell-btn"
            style={{ textAlign: "center", textDecoration: "none" }}
          >
            Add payout account
          </Link>
        </div>
      </main>
    );
  }

  if (done) {
    return (
      <main className="dp-sell">
        <div className="dp-sell-card">
          <h1>Sent for review ✅</h1>
          <p className="dp-sell-hint">
            Your listing is pending. It goes live once an admin approves it.
          </p>
          <Link
            href="/listings"
            className="dp-sell-btn"
            style={{ textAlign: "center", textDecoration: "none" }}
          >
            View my listings
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="dp-sell">
      <form onSubmit={submit} className="dp-sell-card">
        <h1>Sell something</h1>

        {left !== null && (
          <p className={left === 0 ? "dp-sell-error" : "dp-sell-hint"}>
            {left === 0
              ? LIMIT_MSG
              : `${left} of 3 listings left in the next 24 hours. Get verified to remove this limit.`}
          </p>
        )}

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
        <div>
          <input
            required
            type="number"
            min="1"
            max={MAX_STOCK}
            step="1"
            inputMode="numeric"
            placeholder="How many are in stock?"
            value={form.stock}
            onChange={set("stock")}
          />
          <p className="dp-sell-hint">
            Number of units you have to sell. Each completed handover uses one.
          </p>
        </div>
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
          <div className="dp-tags">
            {tags.map((t) => (
              <span key={t} className="dp-tag">
                {t}
                <button
                  type="button"
                  aria-label={`Remove ${t}`}
                  onClick={() => setTags((p) => p.filter((x) => x !== t))}
                >
                  ×
                </button>
              </span>
            ))}
            <input
              value={tagInput}
              placeholder={tags.length ? "" : "Add tags (e.g. iphone, apple, 128gb)"}
              disabled={tags.length >= MAX_TAGS}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "," || e.key === " ") {
                  e.preventDefault();
                  setTags((p) => mergeTags(p, tagInput));
                  setTagInput("");
                } else if (e.key === "Backspace" && !tagInput) {
                  setTags((p) => p.slice(0, -1));
                }
              }}
              onBlur={() => {
                setTags((p) => mergeTags(p, tagInput));
                setTagInput("");
              }}
            />
          </div>
          <p className="dp-sell-hint">
            Words buyers might search for. Press space or Enter after each one.{" "}
            {tags.length}/{MAX_TAGS}
          </p>
        </div>

        <div>
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={files.length >= MAX_IMAGES}
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <p className="dp-sell-hint">
            {MIN_IMAGES} to {MAX_IMAGES} photos required. {files.length} selected.
          </p>
          {files.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              {files.map((f, i) => (
                <div key={`${f.name}-${i}`} style={{ position: "relative" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={URL.createObjectURL(f)}
                    alt=""
                    style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8 }}
                  />
                  <button
                    type="button"
                    aria-label="Remove photo"
                    onClick={() => setFiles((p) => p.filter((_, j) => j !== i))}
                    style={{
                      position: "absolute", top: -6, right: -6, width: 20, height: 20,
                      borderRadius: "50%", border: 0, background: "#000", color: "#fff",
                      cursor: "pointer", lineHeight: "20px", padding: 0,
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <p className="dp-sell-error">{error}</p>}

        <button
          className="dp-sell-btn"
          disabled={saving || !schoolId || files.length < MIN_IMAGES || left === 0}
        >
          {saving ? "Submitting..." : "Submit for approval"}
        </button>
      </form>
    </main>
  );
}