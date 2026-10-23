'use client'
import { createClient } from '@/lib/supabase/client'

export default function GoogleButton({ next = '/dashboard' }: { next?: string }) {
  const signIn = () =>
    createClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback?next=${next}` },
    })
  return (
    <button onClick={signIn} className="w-full rounded-lg border px-4 py-2 font-medium hover:bg-gray-50">
      Continue with Google
    </button>
  )
}