import { supabase } from '../lib/supabase'

const MAX_SIDE = 1200
const MAX_BYTES = 2 * 1024 * 1024

const encode = (c: HTMLCanvasElement, type: string, q: number) =>
  new Promise<Blob | null>((r) => c.toBlob(r, type, q))

/**
 * Resize in the browser before upload (ADR-0004): long side ≤ 1200px, WebP, ≤ 2 MB.
 * Safari can't encode WebP and silently returns PNG, so fall back to JPEG there.
 */
export async function toCoverBlob(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('That file isn’t an image.')
  let bmp: ImageBitmap
  try {
    bmp = await createImageBitmap(file)
  } catch {
    throw new Error('Couldn’t read that image.')
  }
  const k = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * k)
  c.height = Math.round(bmp.height * k)
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
  bmp.close()
  for (const q of [0.85, 0.72, 0.6]) {
    let blob = await encode(c, 'image/webp', q)
    if (!blob || blob.type !== 'image/webp') blob = await encode(c, 'image/jpeg', q)
    if (blob && blob.size <= MAX_BYTES) return blob
  }
  throw new Error('That image is still over 2 MB after resizing.')
}

/** Upload under a random, unguessable name; returns the storage path. */
export async function uploadCover(blob: Blob): Promise<string> {
  const path = `${crypto.randomUUID()}.${blob.type === 'image/webp' ? 'webp' : 'jpg'}`
  const { error } = await supabase.storage
    .from('covers')
    .upload(path, blob, { contentType: blob.type, cacheControl: '31536000', upsert: false })
  if (error) throw error
  return path
}

/** Best effort: an orphaned cover is harmless (unlisted, unguessable), so failures are ignored. */
export async function removeCover(path: string | null | undefined) {
  if (path) await supabase.storage.from('covers').remove([path])
}
