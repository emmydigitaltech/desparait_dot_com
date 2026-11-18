import { Suspense } from 'react';
import { connection } from 'next/server';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import EditListingForm from '@/components/EditListingForm';

async function Loader({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connection();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: listing }, { data: categories }] = await Promise.all([
    supabase.from('listings').select('*').eq('id', id).eq('seller_id', user.id).single(),
    supabase.from('categories').select('slug,label,emoji').order('sort_order'),
  ]);
  if (!listing) notFound();
  return <EditListingForm listing={listing} categories={categories ?? []} />;
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="dp-mut">if (loading) return <Splash />;</p>}>
      <Loader params={params} />
    </Suspense>
  );
}