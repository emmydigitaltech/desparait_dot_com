'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const CONDITIONS = ['new', 'like_new', 'good', 'fair'];
const MAX_TAGS = 15;

export default function EditListingForm({ listing, categories }: any) {
  const router = useRouter();
  const [f, setF] = useState({
    title: listing.title ?? '',
    description: listing.description ?? '',
    price: String(listing.price ?? ''),
    original_price: listing.original_price ? String(listing.original_price) : '',
    category: listing.category,
    condition: listing.condition,
    status: listing.status,
  });
  const [tags, setTags] = useState<string[]>(listing.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  function addTag() {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, ' ');
    if (t && !tags.includes(t) && tags.length < MAX_TAGS) setTags([...tags, t]);
    setTagInput('');
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr('');
    const supabase = createClient();
    const { error } = await supabase.from('listings').update({
      title: f.title.trim(),
      description: f.description.trim(),
      price: parseInt(f.price, 10),
      original_price: f.original_price ? parseInt(f.original_price, 10) : null,
      category: f.category,
      condition: f.condition,
      status: f.status,
      tags,
    }).eq('id', listing.id);
    setBusy(false);
    if (error) return setErr(error.message);
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <form onSubmit={save} className="dp-form">
      <input required value={f.title} onChange={set('title')} placeholder="Title" />
      <textarea value={f.description} onChange={set('description')} placeholder="Description" />
      <input required type="number" min={0} value={f.price} onChange={set('price')} placeholder="Price" />
      <input type="number" min={0} value={f.original_price} onChange={set('original_price')} placeholder="Original price (optional)" />
      <select value={f.category} onChange={set('category')}>
        {categories.map((c: any) => <option key={c.slug} value={c.slug}>{c.emoji} {c.label}</option>)}
      </select>
      <select value={f.condition} onChange={set('condition')}>
        {CONDITIONS.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
      </select>
        <select value={f.status} onChange={set('status')}>
        <option value="active">Active</option>
        {listing.status === 'sold' && <option value="sold">Sold</option>}
      </select>

      <div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {tags.map(t => (
            <button type="button" key={t} onClick={() => setTags(tags.filter(x => x !== t))}
              style={{ border: '1px solid var(--dp-line)', background: 'var(--dp-soft)', color: 'var(--dp-fg)', borderRadius: 999, padding: '4px 10px' }}>
              {t} ×
            </button>
          ))}
        </div>
        <input value={tagInput} onChange={e => setTagInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); } }}
          placeholder={`Add a tag and press Enter (${tags.length}/${MAX_TAGS})`} />
      </div>

      {err && <p style={{ color: 'crimson' }}>{err}</p>}
      <button disabled={busy} type="submit">{busy ? 'Saving…' : 'Save changes'}</button>
    </form>
  );
}