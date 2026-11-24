import { Suspense } from 'react';
import { connection } from 'next/server';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import EditListingForm from '@/components/EditListingForm';
import Splash from "@/components/Splash";

async function Loader({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connection();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=%2Flistings%2F${id}%2Fedit`);

  const [{ data: listing }, { data: categories }, { data: imgs }] = await Promise.all([
    supabase.from('listings').select('*').eq('id', id).eq('seller_id', user.id).single(),
    supabase.from('categories').select('slug,label,emoji').order('sort_order'),
    supabase.from('listing_images').select('url').eq('listing_id', id).order('position'),
  ]);
  if (!listing || listing.status === 'deleted') notFound();

  return (
    <EditListingForm
      listing={listing}
      categories={categories ?? []}
      photos={(imgs ?? []).map((i) => i.url as string)}
    />
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<Splash />}>
      <Loader params={params} />
    </Suspense>
  );
}