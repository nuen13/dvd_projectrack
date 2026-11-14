import { useQuery } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

/** undefined = still checking, null = signed out. */
export function useSession() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])
  return session
}

/** The owner row is readable only by the owner themself (RLS), so a row back = you are the owner. */
export function useIsOwner(userId: string | undefined) {
  return useQuery({
    queryKey: ['is-owner', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from('owner').select('user_id').maybeSingle()
      if (error) throw error
      return data?.user_id === userId
    },
  })
}

export const signInWithGitHub = () =>
  supabase.auth.signInWithOAuth({
    provider: 'github',
    options: { redirectTo: `${location.origin}/admin` },
  })

export const signOut = () => supabase.auth.signOut()
