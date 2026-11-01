'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LikeButton({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let alive = true;
    (async () => {
      const [{ count: total }, { data: { user } }] = await Promise.all([
        supabase
          .from('listing_likes')
          .select('*', { count: 'exact', head: true })
          .eq('listing_id', listingId),
        supabase.auth.getUser(),
      ]);
      let mine = false;
      if (user) {
        const { data } = await supabase
          .from('listing_likes')
          .select('listing_id')
          .eq('listing_id', listingId)
          .eq('user_id', user.id)
          .maybeSingle();
        mine = !!data;
      }
      if (alive) {
        setCount(total ?? 0);
        setLiked(mine);
      }
    })();
    return () => { alive = false; };
  }, [listingId]);

  async function toggle() {
    if (busy) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/login');

    setBusy(true);
    const next = !liked;
    setLiked(next);
    setCount((c) => c + (next ? 1 : -1));

    const { error } = next
      ? await supabase.from('listing_likes').insert({ listing_id: listingId, user_id: user.id })
      : await supabase.from('listing_likes').delete().eq('listing_id', listingId).eq('user_id', user.id);

    if (error) {
      // roll back the optimistic update
      setLiked(!next);
      setCount((c) => c + (next ? -1 : 1));
      console.error('Like error:', error.message);
    }
    setBusy(false);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={liked}
      aria-label={liked ? 'Unlike this listing' : 'Like this listing'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        borderRadius: 999,
        border: '1px solid var(--dp-line)',
        background: liked ? 'var(--dp-inv)' : 'var(--dp-soft)',
        color: liked ? 'var(--dp-invfg)' : 'var(--dp-fg)',
        cursor: 'pointer',
      }}
    >
      <span aria-hidden>{liked ? '♥' : '♡'}</span>
      <span>{count}</span>
    </button>
  );
}