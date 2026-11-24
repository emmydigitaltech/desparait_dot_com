"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Category = { slug: string; label: string; emoji: string | null };
type Photo = { url: string; file?: File }; // file is set only for newly added photos

const CONDITIONS = [
  { value: "new", label: "New" },
  { value: "like_new", label: "Like new" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
];

const STATUS: Record<string, string> = {
  active: "Live",
  sold: "Sold out",
  pending: "In review",
  rejected: "Rejected",
};

const MAX_TAGS = 15;
const MIN_IMAGES = 4;
const MAX_IMAGES = 10;
const BUCKET = "listing-images";

function mergeTags(prev: string[], raw: string) {
  const parts = raw
    .toLowerCase()
    .split(/[\s,]+/)
    .map((t) => t.replace(/[^a-z0-9-]/g, "").slice(0, 30))
    .filter(Boolean);
  return Array.from(new Set([...prev, ...parts])).slice(0, MAX_TAGS);
}

// storage path from a public url
function pathFromUrl(url: string) {
  const part = url.split(`/${BUCKET}/`)[1];
  return part ? decodeURIComponent(part.split("?")[0]) : null;
}

export default function EditListingForm({
  listing,
  categories,
  photos: initialPhotos,
}: {
  listing: any;
  categories: Category[];
  photos: string[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const status: string = listing.status;
  const stock: number = listing.stock ?? 0;

  const [photos, setPhotos] = useState<Photo[]>(initialPhotos.map((url) => ({ url })));
  const [addStock, setAddStock] = useState("");
  const [form, setForm] = useState({
    title: listing.title ?? "",
    description: listing.description ?? "",
    price: String(listing.price ?? ""),
    original_price: listing.original_price ? String(listing.original_price) : "", // CHANGE if column name differs
    category: listing.category ?? "",
    condition: listing.condition ?? "good",
  });
  const [tags, setTags] = useState<string[]>(listing.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string) => (e: React.ChangeEvent<any>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  function addFiles(list: FileList | null) {
    const picked = Array.from(list ?? []).filter((f) => f.type.startsWith("image/"));
    setPhotos((prev) =>
      [...prev, ...picked.map((file) => ({ url: URL.createObjectURL(file), file }))].slice(0, MAX_IMAGES)
    );
  }

  function removePhoto(i: number) {
    setPhotos((prev) => {
      if (prev[i].file) URL.revokeObjectURL(prev[i].url);
      return prev.filter((_, j) => j !== i);
    });
  }

  function makeCover(i: number) {
    setPhotos((prev) => [prev[i], ...prev.filter((_, j) => j !== i)]);
  }

  function move(i: number, dir: -1 | 1) {
    setPhotos((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (photos.length < MIN_IMAGES)
      return setError(`Keep at least ${MIN_IMAGES} photos (you have ${photos.length}).`);

    const price = Math.round(Number(form.price));
    if (!Number.isFinite(price) || price < 0) return setError("Enter a valid price.");

    const orig = form.original_price.trim() === "" ? null : Math.round(Number(form.original_price));
    if (orig !== null && (!Number.isFinite(orig) || orig < price))
      return setError("Original price must be higher than the current price.");

    const units = addStock.trim() === "" ? 0 : Math.floor(Number(addStock));
    if (!Number.isFinite(units) || units < 0 || units > 9999)
      return setError("Units to add must be between 0 and 9999.");

    setSaving(true);
    const uploadedPaths: string[] = [];
    let deletedRows = false;

    try {
      // 1. upload new photos
      const finalUrls: string[] = [];
      for (const p of photos) {
        if (!p.file) {
          finalUrls.push(p.url);
          continue;
        }
        const ext = p.file.name.split(".").pop() ?? "jpg";
        const path = `${listing.seller_id}/${listing.id}-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, p.file, { contentType: p.file.type });
        if (upErr) throw upErr;
        uploadedPaths.push(path);
        finalUrls.push(supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
      }

      // 2. rewrite the image rows in the new order
      const { error: delErr } = await supabase
        .from("listing_images")
        .delete()
        .eq("listing_id", listing.id);
      if (delErr) throw delErr;
      deletedRows = true;

      const { error: insErr } = await supabase
        .from("listing_images")
        .insert(finalUrls.map((url, position) => ({ listing_id: listing.id, url, position })));
      if (insErr) throw insErr;

      // 3. update listing details and cover
      const { error: upErr } = await supabase
        .from("listings")
        .update({
          title: form.title.trim(),
          description: form.description.trim(),
          price,
          original_price: orig, // CHANGE if column name differs
          category: form.category,
          condition: form.condition,
          tags: mergeTags(tags, tagInput),
          image_url: finalUrls[0],
        })
        .eq("id", listing.id);
      if (upErr) throw upErr;

      // 4. restock if asked
      if (units > 0) {
        const { error: rsErr } = await supabase.rpc("restock_my_listing", {
          p_listing_id: listing.id,
          p_stock: units,
        });
        if (rsErr) throw rsErr;
      }

      // 5. clean up files for removed photos (best effort)
      const removed = initialPhotos
        .filter((u) => !finalUrls.includes(u))
        .map(pathFromUrl)
        .filter(Boolean) as string[];
      if (removed.length) await supabase.storage.from(BUCKET).remove(removed);

      router.push("/listings");
      router.refresh();
    } catch (err: any) {
      // put the old rows back if we deleted them and the insert failed
      if (deletedRows) {
        const { count } = await supabase
          .from("listing_images")
          .select("*", { count: "exact", head: true })
          .eq("listing_id", listing.id);
        if (!count) {
          await supabase
            .from("listing_images")
            .insert(initialPhotos.map((url, position) => ({ listing_id: listing.id, url, position })));
        }
      }
      if (uploadedPaths.length) await supabase.storage.from(BUCKET).remove(uploadedPaths);
      setError(err.message ?? "Something went wrong.");
      setSaving(false);
    }
  }

  const canRestock = status === "active" || status === "sold";

  return (
    <main className="fe-wrap">
      <div className="fe-head">
        <div>
          <Link href="/listings" className="fv-link fv-sm">← Back to my listings</Link>
          <h1 className="fv-title">Edit listing</h1>
        </div>
        <span className={`fv-pill fv-st-${status}`}>{STATUS[status] ?? status}</span>
      </div>

      <form onSubmit={save} className="fe-grid">
        <div className="fe-col">
          {/* PHOTOS */}
          <div className="fv-card">
            <div className="fv-row">
              <h2 className="fv-h" style={{ margin: 0 }}>Photos</h2>
              <span className="fv-mut fv-sm">{photos.length}/{MAX_IMAGES} · min {MIN_IMAGES}</span>
            </div>

            <div className="fe-pgrid">
              {photos.map((p, i) => (
                <div key={p.url} className={`fe-photo ${i === 0 ? "is-cover" : ""}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="" />
                  {i === 0 && <span className="fe-badge">Cover</span>}
                  {p.file && <span className="fe-badge fe-badge-new">New</span>}
                  <button type="button" className="fe-x" aria-label="Remove photo" onClick={() => removePhoto(i)}>×</button>
                  <div className="fe-bar">
                    <button type="button" aria-label="Move left" disabled={i === 0} onClick={() => move(i, -1)}>←</button>
                    {i !== 0 && <button type="button" onClick={() => makeCover(i)}>Make cover</button>}
                    <button type="button" aria-label="Move right" disabled={i === photos.length - 1} onClick={() => move(i, 1)}>→</button>
                  </div>
                </div>
              ))}

              {photos.length < MAX_IMAGES && (
                <button type="button" className="fe-add" onClick={() => fileRef.current?.click()}>
                  <span>＋</span>
                  Add photos
                </button>
              )}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <p className="fv-mut fv-sm" style={{ marginTop: 10 }}>
              The first photo is the cover buyers see. Changes apply when you press Save.
            </p>
          </div>

          <div className="fv-card fe-fields">
            <h2 className="fv-h">Details</h2>

            <label className="fe-label">
              Title
              <input required value={form.title} onChange={set("title")} placeholder="e.g. Metal bed frame" />
            </label>

            <label className="fe-label">
              Description
              <textarea rows={5} value={form.description} onChange={set("description")}
                placeholder="Condition, size, what is included..." />
            </label>

            <div className="fe-two">
              <label className="fe-label">
                Price (₦)
                <input required type="number" min="0" value={form.price} onChange={set("price")} />
              </label>
              <label className="fe-label">
                Original price (₦, optional)
                <input type="number" min="0" value={form.original_price}
                  onChange={set("original_price")} placeholder="Shows a discount" />
              </label>
            </div>

            <div className="fe-two">
              <label className="fe-label">
                Category
                <select required value={form.category} onChange={set("category")}>
                  <option value="">Choose a category</option>
                  {categories.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.emoji ? `${c.emoji} ` : ""}{c.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="fe-label">
                Condition
                <select value={form.condition} onChange={set("condition")}>
                  {CONDITIONS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="fv-card fe-fields">
            <h2 className="fv-h">Tags</h2>
            <div className="fe-tags">
              {tags.map((t) => (
                <span key={t} className="fe-tag">
                  {t}
                  <button type="button" aria-label={`Remove ${t}`}
                    onClick={() => setTags((p) => p.filter((x) => x !== t))}>×</button>
                </span>
              ))}
              <input
                value={tagInput}
                placeholder={tags.length ? "" : "Add a tag, press space or Enter"}
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
            <p className="fv-mut fv-sm">Words buyers might search for. {tags.length}/{MAX_TAGS}</p>
          </div>
        </div>

        <aside className="fe-col">
          <div className="fv-card fe-fields">
            <h2 className="fv-h">Stock</h2>
            <p className="fv-big">{stock}</p>
            <p className="fv-mut fv-sm">units in stock</p>
            {canRestock ? (
              <label className="fe-label">
                Add units
                <input type="number" min="0" max="9999" inputMode="numeric"
                  value={addStock} onChange={(e) => setAddStock(e.target.value)} placeholder="0" />
                {status === "sold" && (
                  <span className="fv-mut fv-sm">Adding units puts this listing back on sale.</span>
                )}
              </label>
            ) : (
              <p className="fv-mut fv-sm">Stock can be changed once the listing is approved.</p>
            )}
          </div>

          {error && <p className="fv-err">{error}</p>}

          <div className="fe-actions">
            <button className="fv-btn" disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </button>
            <Link href="/listings" className="fv-btn-o" style={{ textAlign: "center" }}>
              Cancel
            </Link>
          </div>
        </aside>
      </form>
    </main>
  );
}