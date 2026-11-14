import type { CSSProperties } from 'react'
import type { Database } from '../lib/database.types'
import { supabase } from '../lib/supabase'
import { site } from '../site.config'

export type DiscRow = Database['public']['Tables']['discs']['Row']
export type DiscStatus = Database['public']['Enums']['disc_status']
/** What the public site fetches: everything except who owns it. */
export type Disc = Omit<DiscRow, 'owner_id'>

export const PUBLIC_DISC_COLUMNS =
  'id,title,spine_text,kind,made_for,description,tags,url,status,is_public,cover_tag,shipped_on,position,' +
  'cover_bg,cover_fg,pattern,spine_wide,thickness,height,image_path,image_mode,created_at,updated_at'

export const STATUS_LABEL: Record<DiscStatus, string> = {
  idea: 'Idea',
  planned: 'Planned',
  in_progress: 'In progress',
  shipped: 'Shipped',
  paused: 'Paused',
  archived: 'Archived',
}

/** Cover width is derived from height so every cover keeps one aspect ratio (ADR-0006). */
export const coverWidth = (height: number) => Math.round(height * 0.74)
/** Gap beside a disc on the shelf, derived from spine thickness (ADR-0006). */
export const shelfGap = (thickness: number) => Math.round(3 + (thickness - 16) / 16)

export const pad = (n: number) => String(n).padStart(2, '0')
export const hex = (c: string | null | undefined) => (c && /^#[0-9a-f]{6}$/i.test(c) ? c : '#333333')

/** Only http(s) links ever become hrefs (the DB enforces this too). */
export function safeUrl(u: string | null | undefined): string {
  const s = String(u ?? '').trim()
  if (!s) return ''
  try {
    const x = new URL(/^[a-z][a-z0-9+.-]*:/i.test(s) ? s : `https://${s}`)
    return x.protocol === 'https:' || x.protocol === 'http:' ? x.href : ''
  } catch {
    return ''
  }
}

export function coverTag(d: Pick<Disc, 'cover_tag' | 'status'>): string {
  if (d.cover_tag) return d.cover_tag
  return d.status === 'shipped' ? site.defaultCoverTag : STATUS_LABEL[d.status]
}

export function coverImageUrl(d: Pick<Disc, 'image_path'>): string {
  if (!d.image_path) return ''
  if (/^(blob:|data:image\/|https?:)/.test(d.image_path)) return d.image_path // unsaved previews / demo
  return supabase.storage.from('covers').getPublicUrl(d.image_path).data.publicUrl
}

type LookFields = Pick<Disc, 'thickness' | 'height' | 'cover_bg' | 'cover_fg'>

/** CSS custom properties consumed by the ported shelf CSS. */
export function discVars(d: LookFields): CSSProperties {
  return {
    '--t': d.thickness,
    '--w': coverWidth(d.height),
    '--h': d.height,
    '--g': shelfGap(d.thickness),
    '--cb': hex(d.cover_bg),
    '--cf': hex(d.cover_fg),
  } as CSSProperties
}
