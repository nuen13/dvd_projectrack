import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { PUBLIC_DISC_COLUMNS, type Disc } from './disc'

/** Dev-only: append ?demo to the URL to fill the shelf with sample discs. Stripped from prod builds. */
const useDemo = import.meta.env.DEV && new URLSearchParams(location.search).has('demo')

/**
 * Showcased discs = Shipped AND Public (ADR-0002). RLS already enforces this for visitors;
 * the explicit filter matters when the owner is signed in, since RLS then lets them read everything.
 */
export function useShowcasedDiscs() {
  return useQuery({
    queryKey: ['discs', 'showcased', useDemo],
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<Disc[]> => {
      if (useDemo) return (await import('../dev/demoDiscs')).demoDiscs
      const { data, error } = await supabase
        .from('discs')
        .select(PUBLIC_DISC_COLUMNS)
        .eq('status', 'shipped')
        .eq('is_public', true)
        .order('position')
        .order('created_at')
      if (error) throw error
      return data as unknown as Disc[]
    },
  })
}
