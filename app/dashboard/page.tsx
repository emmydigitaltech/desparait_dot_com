import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

const STEPS = [
  { key: 'full_name', label: 'Add your full name' },
  { key: 'avatar_url', label: 'Add a profile photo' },
  { key: 'phone', label: 'Add your phone number' },
  { key: 'campus', label: 'Select your campus' },
] as const

async function Dashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: req }] = await Promise.all([
    supabase.from('profiles')
      .select('full_name, avatar_url, phone, campus, role, is_verified')
      .eq('id', user.id).single(),
    supabase.from('verification_requests')
      .select('status, note').eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ])

  const done = STEPS.filter((s) => profile?.[s.key])
  const pct = Math.round((done.length / STEPS.length) * 100)
  const missing = STEPS.filter((s) => !profile?.[s.key])

  const category =
    profile?.role === 'admin' ? 'Admin'
    : profile?.is_verified ? 'Verified seller'
    : req?.status === 'pending' ? 'Seller (pending review)'
    : 'Buyer'

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <header className="flex items-center gap-4">
        {profile?.avatar_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatar_url} alt="" className="h-14 w-14 rounded-full" />
        )}
        <div>
          <h1 className="text-xl font-semibold">{profile?.full_name ?? user.email}</h1>
          <span className="rounded-full bg-blue-100 px-3 py-0.5 text-sm text-blue-800">{category}</span>
        </div>
      </header>

      <section className="rounded-xl border p-4">
        <div className="mb-2 flex justify-between text-sm font-medium">
          <span>Profile completion</span><span>{pct}%</span>
        </div>
        <div className="h-2 rounded-full bg-gray-200">
          <div className="h-2 rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
        </div>
        {missing.length > 0 && (
          <ul className="mt-3 list-disc pl-5 text-sm text-gray-600">
            {missing.map((m) => <li key={m.key}>{m.label}</li>)}
          </ul>
        )}
        <Link href="/dashboard/profile" className="mt-3 inline-block text-sm text-blue-600 underline">
          Edit profile
        </Link>
      </section>

      <section className="rounded-xl border p-4">
        {profile?.role === 'admin' ? (
          <Link href="/admin" className="text-blue-600 underline">Go to admin panel</Link>
        ) : profile?.is_verified ? (
          <Link href="/listings/new" className="text-blue-600 underline">Create a listing</Link>
        ) : req?.status === 'pending' ? (
          <p className="text-sm">Your seller verification is under review.</p>
        ) : (
          <>
            {req?.status === 'rejected' && (
              <p className="mb-2 text-sm text-red-600">Rejected: {req.note}</p>
            )}
            <p className="mb-2 text-sm">Want to sell on campus?</p>
            <Link href="/verify" className="rounded-lg bg-blue-600 px-4 py-2 text-white">
              {req?.status === 'rejected' ? 'Resubmit verification' : 'Become a verified seller'}
            </Link>
          </>
        )}
      </section>
    </main>
  )
}

export default function Page() {
  return <Suspense fallback={<p className="p-6">Loading…</p>}><Dashboard /></Suspense>
}