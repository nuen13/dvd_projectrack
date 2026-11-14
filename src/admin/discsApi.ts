import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { DiscRow, DiscStatus } from '../discs/disc'
import type { Database } from '../lib/database.types'

type DiscUpdate = Database['public']['Tables']['discs']['Update']
const ALL = ['discs', 'all'] as const

/** Every disc, any status (RLS lets only the owner see these). */
export function useAllDiscs() {
  return useQuery({
    queryKey: ALL,
    queryFn: async (): Promise<DiscRow[]> => {
      const { data, error } = await supabase.from('discs').select('*').order('position').order('created_at')
      if (error) throw error
      return data
    },
  })
}

export const today = () => new Date().toLocaleDateString('en-CA') // YYYY-MM-DD, local time

/** Moving to Shipped stamps today's date if none is set yet. */
export function withShippedDate(patch: DiscUpdate, current: Pick<DiscRow, 'shipped_on'>): DiscUpdate {
  return patch.status === 'shipped' && !current.shipped_on && patch.shipped_on === undefined
    ? { ...patch, shipped_on: today() }
    : patch
}

export function useUpdateDisc() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: DiscUpdate }) => {
      const { error } = await supabase.from('discs').update(patch).eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: ALL })
      const prev = qc.getQueryData<DiscRow[]>(ALL)
      qc.setQueryData<DiscRow[]>(ALL, (rows) => rows?.map((r) => (r.id === id ? { ...r, ...patch } as DiscRow : r)))
      return { prev }
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(ALL, ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['discs'] }),
  })
}

/** Persist a new shelf order: position = index. Only rows whose position changed are written. */
export function useReorderDiscs() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (ordered: DiscRow[]) => {
      const changed = ordered.map((d, i) => ({ d, i })).filter(({ d, i }) => d.position !== i)
      const results = await Promise.all(
        changed.map(({ d, i }) => supabase.from('discs').update({ position: i }).eq('id', d.id)),
      )
      const failed = results.find((r) => r.error)
      if (failed?.error) throw failed.error
    },
    onMutate: async (ordered) => {
      await qc.cancelQueries({ queryKey: ALL })
      const prev = qc.getQueryData<DiscRow[]>(ALL)
      qc.setQueryData<DiscRow[]>(ALL, ordered.map((d, i) => ({ ...d, position: i })))
      return { prev }
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(ALL, ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['discs'] }),
  })
}

const PRESETS: [string, string][] = [
  ['#1f3d93', '#e2e8ff'], ['#d7262f', '#fff3f0'], ['#171717', '#c6f36a'], ['#f2c230', '#1a1a1a'],
  ['#e9a6c2', '#3a1226'], ['#2f7d4f', '#e6f4ea'], ['#d3e6f7', '#2a6db5'], ['#ece8de', '#1f3d93'],
  ['#1c2250', '#a8b9ff'], ['#3b3b3b', '#ebe6d8'], ['#ff6a2b', '#fff6ee'], ['#6c4bd8', '#f1ecff'],
]
export const COLOUR_PRESETS = PRESETS

export function useCreateDisc() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ title, status, position }: { title: string; status: DiscStatus; position: number }) => {
      const [bg, fg] = PRESETS[Math.floor(Math.random() * PRESETS.length)]
      const { data, error } = await supabase
        .from('discs')
        .insert(withShippedDate({ title, status, position, cover_bg: bg, cover_fg: fg }, { shipped_on: null }) as Database['public']['Tables']['discs']['Insert'])
        .select('id')
        .single()
      if (error) throw error
      return data.id
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['discs'] }),
  })
}
