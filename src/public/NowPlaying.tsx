import { useEffect, useRef, type CSSProperties } from 'react'
import { Cover } from '../discs/DiscFaces'
import { coverWidth, hex, pad, safeUrl, type Disc } from '../discs/disc'

const shippedLabel = (d: string | null) =>
  d ? `Shipped ${new Date(`${d}T00:00:00`).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })}` : null

export function NowPlaying({ disc, n, onClose, onEject }: {
  disc: Disc
  n: number
  onClose(): void
  onEject(): void
}) {
  const closeBtn = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    document.body.classList.add('locked')
    const t = setTimeout(() => closeBtn.current?.focus({ preventScroll: true }), 30)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCloseRef.current() }
    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('locked')
      prev?.focus?.({ preventScroll: true })
    }
  }, [])

  const url = safeUrl(disc.url)
  const meta = [disc.made_for, disc.kind, shippedLabel(disc.shipped_on)].filter(Boolean).join(' · ')
  const vars = { '--pb': hex(disc.cover_bg), '--pf': hex(disc.cover_fg), '--w': coverWidth(disc.height), '--h': disc.height } as CSSProperties

  return (
    <div className="modal">
      <div className="backdrop" onClick={onClose} />
      <div className="win pop" role="dialog" aria-modal="true" aria-labelledby="popTitle" style={vars}>
        <div className="bar">
          <span>▶ NOW PLAYING · NO. {pad(n)}</span>
          <button className="x" ref={closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="pop-body">
          <div className="pop-cover"><Cover disc={disc} n={n} /></div>
          <div>
            <div className="pop-meta">{meta}</div>
            <h2 id="popTitle">{disc.title}</h2>
            <p className="pop-desc">{disc.description || 'No description yet.'}</p>
            {disc.tags.length > 0 && <div className="chips">{disc.tags.map((t) => <span key={t}>{t}</span>)}</div>}
            <div className="pop-actions">
              {url
                ? <a className="btn primary" href={url} target="_blank" rel="noopener noreferrer">Open website ↗</a>
                : <span className="nolink">No website linked yet</span>}
              <button className="btn" onClick={onEject}>⏏ Eject</button>
            </div>
            {url && <div className="pop-url">{url}</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
