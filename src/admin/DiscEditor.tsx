import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Cover, SpineContent } from '../discs/DiscFaces'
import { coverImageUrl, discVars, safeUrl, STATUS_LABEL, type DiscRow, type DiscStatus } from '../discs/disc'
import { PATTERNS } from '../discs/patterns'
import { supabase } from '../lib/supabase'
import { site } from '../site.config'
import { removeCover, toCoverBlob, uploadCover } from './coverImage'
import { COLOUR_PRESETS, today, useAllDiscs } from './discsApi'

const STATUSES = Object.keys(STATUS_LABEL) as DiscStatus[]
const PATTERN_LABEL: Record<string, string> = {
  rings: 'Rings', checks: 'Checklist', grid: 'Calendar grid', bubbles: 'Chat bubbles', candles: 'Candlesticks',
  chart: 'Line chart', lock: 'Lock', brackets: 'Code brackets', dots: 'Dots', nodes: 'Network', stripes: 'Stripes', none: 'None',
}

type Draft = Pick<DiscRow,
  'title' | 'spine_text' | 'kind' | 'made_for' | 'description' | 'url' | 'status' | 'is_public' | 'cover_tag' |
  'shipped_on' | 'cover_bg' | 'cover_fg' | 'pattern' | 'spine_wide' | 'thickness' | 'height' | 'image_path' | 'image_mode'
> & { tagsText: string }

function draftFrom(d?: DiscRow): Draft {
  const [bg, fg] = COLOUR_PRESETS[Math.floor(Math.random() * COLOUR_PRESETS.length)]
  return {
    title: d?.title ?? '', spine_text: d?.spine_text ?? '', kind: d?.kind ?? '', made_for: d?.made_for ?? '',
    description: d?.description ?? '', url: d?.url ?? '', status: d?.status ?? 'idea', is_public: d?.is_public ?? false,
    cover_tag: d?.cover_tag ?? '', shipped_on: d?.shipped_on ?? '', cover_bg: d?.cover_bg ?? bg, cover_fg: d?.cover_fg ?? fg,
    pattern: d?.pattern ?? 'dots', spine_wide: d?.spine_wide ?? false, thickness: d?.thickness ?? 34, height: d?.height ?? 340,
    image_path: d?.image_path ?? null, image_mode: d?.image_mode ?? 'art', tagsText: (d?.tags ?? []).join(', '),
  }
}

const orNull = (s: string | null) => (s && s.trim() ? s.trim() : null)

export function DiscEditor() {
  const { id } = useParams()
  const isNew = id === 'new'
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: discs, isLoading } = useAllDiscs()
  const disc = useMemo(() => discs?.find((d) => d.id === id), [discs, id])

  const [draft, setDraft] = useState<Draft | null>(null)
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [delArmed, setDelArmed] = useState(false)
  const [dropHot, setDropHot] = useState(false)

  // Initialise once the disc is known (or immediately for a new one).
  useEffect(() => {
    if (draft) return
    if (isNew) setDraft(draftFrom())
    else if (disc) setDraft(draftFrom(disc))
  }, [draft, isNew, disc])

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])

  if (isLoading || (!isNew && !disc && !discs)) return <p className="rk-muted">Loading…</p>
  if (!isNew && !disc) return <div className="rk-card"><p>That disc doesn’t exist.</p><Link to="/admin">← Back to discs</Link></div>
  if (!draft) return null

  const n = isNew ? (discs?.length ?? 0) + 1 : (discs?.indexOf(disc!) ?? 0) + 1
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d))
  const field = (k: keyof Draft) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    set(k, e.target.value as never)

  const shownImage = previewUrl ?? draft.image_path
  const preview = { ...draft, title: draft.title || 'Untitled', image_path: shownImage }
  const urlBad = !!draft.url?.trim() && !safeUrl(draft.url)

  async function pickImage(file: File | undefined) {
    if (!file) return
    setError(null)
    try {
      const blob = await toCoverBlob(file)
      setPendingBlob(blob)
      setPreviewUrl(URL.createObjectURL(blob))
    } catch (e) {
      setError((e as Error).message)
    }
  }
  function removeImage() {
    setPendingBlob(null)
    setPreviewUrl(null)
    set('image_path', null)
  }
  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDropHot(false)
    void pickImage(e.dataTransfer.files[0])
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!draft) return
    const title = draft.title.trim()
    if (!title) return setError('Give the disc a title.')
    if (urlBad) return setError('The website link must start with http:// or https://')
    setSaving(true)
    setError(null)
    let uploaded: string | null = null
    try {
      if (pendingBlob) uploaded = await uploadCover(pendingBlob)
      const imagePath = uploaded ?? draft.image_path
      const shipped_on = draft.status === 'shipped' && !draft.shipped_on ? today() : orNull(draft.shipped_on)
      const row = {
        title,
        spine_text: orNull(draft.spine_text), kind: orNull(draft.kind), made_for: orNull(draft.made_for),
        description: orNull(draft.description), url: draft.url?.trim() ? safeUrl(draft.url) : null,
        status: draft.status, is_public: draft.is_public, cover_tag: orNull(draft.cover_tag), shipped_on,
        cover_bg: draft.cover_bg, cover_fg: draft.cover_fg, pattern: draft.pattern, spine_wide: draft.spine_wide,
        thickness: draft.thickness, height: draft.height, image_path: imagePath, image_mode: draft.image_mode,
        tags: draft.tagsText.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 20),
      }
      if (isNew) {
        const { error } = await supabase.from('discs').insert({ ...row, position: discs?.length ?? 0 })
        if (error) throw error
      } else {
        const { error } = await supabase.from('discs').update(row).eq('id', disc!.id)
        if (error) throw error
        if (disc!.image_path && disc!.image_path !== imagePath) await removeCover(disc!.image_path)
      }
      await qc.invalidateQueries({ queryKey: ['discs'] })
      navigate('/admin')
    } catch (err) {
      if (uploaded) await removeCover(uploaded) // don't leave an orphan behind
      setError(`Couldn’t save: ${(err as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  async function del() {
    if (!disc) return
    if (!delArmed) return setDelArmed(true)
    setSaving(true)
    const { error } = await supabase.from('discs').delete().eq('id', disc.id)
    if (error) {
      setSaving(false)
      return setError(`Couldn’t delete: ${error.message}`)
    }
    await removeCover(disc.image_path)
    await qc.invalidateQueries({ queryKey: ['discs'] })
    navigate('/admin')
  }

  return (
    <form className="rk-editor" onSubmit={save} noValidate>
      <div className="rk-ed-head">
        <Link to="/admin" className="rk-muted">← Discs</Link>
        <h1>{isNew ? 'New disc' : `Edit · No. ${String(n).padStart(2, '0')}`}</h1>
      </div>

      <div className="rk-ed-body">
        <aside className="rk-prev">
          <div className="rk-prev-stage">
            <div className={`prev-spine sp${draft.spine_wide ? ' wide' : ''}`} style={discVars(draft)}>
              <SpineContent disc={preview} n={n} />
            </div>
            <Cover disc={preview} n={n} className="prev-cover" />
          </div>
          <p className="rk-muted rk-note">Live preview</p>
          <p className={`rk-badge${draft.status === 'shipped' && draft.is_public ? ' live' : ''}`}>
            {draft.status === 'shipped' && draft.is_public
              ? 'Showcased on the public site'
              : draft.is_public ? 'Public, but only Shipped discs are shown' : 'Hidden from the public site'}
          </p>
        </aside>

        <div className="rk-fields">
          <label className="f wide"><span>Title *</span>
            <input value={draft.title} onChange={field('title')} maxLength={60} required placeholder="e.g. Clinical Session Recorder" autoFocus={isNew} />
          </label>
          <label className="f"><span>Spine text</span>
            <input value={draft.spine_text ?? ''} onChange={field('spine_text')} maxLength={24} placeholder="Short name on the spine" />
          </label>
          <label className="f"><span>Type / platform</span>
            <input value={draft.kind ?? ''} onChange={field('kind')} maxLength={30} placeholder="e.g. Power Apps" />
          </label>
          <label className="f"><span>Made for</span>
            <input value={draft.made_for ?? ''} onChange={field('made_for')} maxLength={30} placeholder="e.g. Personal" />
          </label>
          <label className="f"><span>Status</span>
            <select value={draft.status} onChange={field('status')}>
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </label>
          <label className="f rk-check"><input type="checkbox" checked={draft.is_public} onChange={(e) => set('is_public', e.target.checked)} />
            <span>Show publicly (when Shipped)</span>
          </label>
          <label className="f"><span>Shipped on</span>
            <input type="date" value={draft.shipped_on ?? ''} onChange={field('shipped_on')} />
          </label>
          <label className="f"><span>Cover tag</span>
            <input value={draft.cover_tag ?? ''} onChange={field('cover_tag')} maxLength={20} placeholder={draft.status === 'shipped' ? site.defaultCoverTag : STATUS_LABEL[draft.status]} />
          </label>
          <label className="f wide"><span>Website link</span>
            <input type="url" inputMode="url" value={draft.url ?? ''} onChange={field('url')} maxLength={400} placeholder="https://…" aria-invalid={urlBad} />
            <small className={urlBad ? 'rk-err' : 'rk-muted'}>{urlBad ? 'Must be an http(s) link.' : 'The “Open website” button in the player goes here.'}</small>
          </label>
          <label className="f wide"><span>Description</span>
            <textarea value={draft.description ?? ''} onChange={field('description')} maxLength={900} placeholder="What it is, what you built, what’s interesting about it" />
          </label>
          <label className="f wide"><span>Tech / tags</span>
            <input value={draft.tagsText} onChange={field('tagsText')} maxLength={300} placeholder="Comma separated, e.g. C#, .NET, Azure" />
          </label>

          <div className="f wide"><span>Cover colours</span>
            <div className="rk-row">
              <label className="rk-colour"><input type="color" value={draft.cover_bg} onChange={field('cover_bg')} aria-label="Cover colour" /> Cover</label>
              <label className="rk-colour"><input type="color" value={draft.cover_fg} onChange={field('cover_fg')} aria-label="Text colour" /> Text</label>
              <div className="rk-swatches">
                {COLOUR_PRESETS.map(([bg, fg], k) => (
                  <button type="button" key={k} className="rk-sw" style={{ background: bg }} aria-label={`Colour preset ${k + 1}`}
                    onClick={() => setDraft((d) => (d ? { ...d, cover_bg: bg, cover_fg: fg } : d))}>
                    <i style={{ background: fg }} />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <label className="f"><span>Pattern</span>
            <select value={draft.pattern} onChange={field('pattern')}>
              {PATTERNS.map((p) => <option key={p} value={p}>{PATTERN_LABEL[p]}</option>)}
            </select>
          </label>
          <label className="f"><span>Spine style</span>
            <select value={draft.spine_wide ? '1' : '0'} onChange={(e) => set('spine_wide', e.target.value === '1')}>
              <option value="0">Regular</option><option value="1">Wide-spaced letters</option>
            </select>
          </label>
          <label className="f"><span>Spine thickness <output>{draft.thickness}</output></span>
            <input type="range" min={16} max={64} step={1} value={draft.thickness} onChange={(e) => set('thickness', +e.target.value)} />
          </label>
          <label className="f"><span>Height <output>{draft.height}</output></span>
            <input type="range" min={280} max={392} step={2} value={draft.height} onChange={(e) => set('height', +e.target.value)} />
          </label>

          <div className="f wide"><span>Cover image (optional)</span>
            <div className={`rk-drop${dropHot ? ' hot' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDropHot(true) }}
              onDragLeave={() => setDropHot(false)}
              onDrop={onDrop}>
              {shownImage && <img src={coverImageUrl({ image_path: shownImage })} alt="" />}
              <div className="rk-drop-text">
                <label className="rk-link">
                  {shownImage ? 'Replace image' : 'Upload an image'}
                  <input type="file" accept="image/*" onChange={(e) => { void pickImage(e.target.files?.[0]); e.target.value = '' }} />
                </label>
                <span className="rk-muted"> or drop one here · resized to WebP, max 2 MB</span>
                {shownImage && (
                  <div className="rk-row">
                    <select value={draft.image_mode} onChange={field('image_mode')} aria-label="Image placement">
                      <option value="art">In the art box</option>
                      <option value="full">Fill the whole cover</option>
                    </select>
                    <button type="button" className="rk-btn rk-small" onClick={removeImage}>Remove image</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rk-ed-foot">
        {!isNew && (
          <button type="button" className={`rk-btn rk-danger${delArmed ? ' armed' : ''}`} onClick={() => void del()} disabled={saving}>
            {delArmed ? 'Click again to delete' : 'Delete'}
          </button>
        )}
        <span className="rk-grow" />
        {error && <span className="rk-err" role="alert">{error}</span>}
        <Link to="/admin" className="rk-btn">Cancel</Link>
        <button type="submit" className="rk-btn rk-primary" disabled={saving}>{saving ? 'Saving…' : 'Save disc'}</button>
      </div>
    </form>
  )
}
