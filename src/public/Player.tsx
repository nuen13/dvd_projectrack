import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { coverImageUrl, hex, pad, safeUrl, type Disc } from '../discs/disc'
import { patternSvg } from '../discs/patterns'
import { site } from '../site.config'

export type ScreenMode = 'idle' | 'on' | 'off'

const BOUNCE_COLOURS = ['#ffffff', '#ffe14d', '#7ff0ff', '#ff8ad8', '#9dff7a']

export function Player({ disc, n, screen, vfdOverride, hot, rigRef, mouthRef, onEject, onDetails }: {
  disc: Disc | null
  n: number
  screen: ScreenMode
  vfdOverride: string | null
  hot: boolean
  rigRef: RefObject<HTMLElement | null>
  mouthRef: RefObject<HTMLDivElement | null>
  onEject(): void
  onDetails(): void
}) {
  const screenRef = useRef<HTMLDivElement>(null)
  const bounceRef = useRef<HTMLDivElement>(null)
  const modeRef = useRef(screen)
  modeRef.current = screen

  // Timecode while a disc plays.
  const [t, setT] = useState(0)
  const discId = disc?.id
  useEffect(() => {
    if (screen !== 'on' || !discId) return
    setT(0)
    const id = setInterval(() => setT((x) => x + 1), 1000)
    return () => clearInterval(id)
  }, [screen, discId])

  // DVD-style bouncing "NO DISC" logo while idle.
  useEffect(() => {
    const b = bounceRef.current, s = screenRef.current
    if (!b || !s) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      b.style.transform = 'translate(30px,40px)'
      return
    }
    let x = 20, y = 20, vx = 0.9, vy = 0.7, hue = 0, raf = 0
    const f = () => {
      if (modeRef.current !== 'on') {
        const W = s.clientWidth - b.offsetWidth, H = s.clientHeight - b.offsetHeight
        x += vx; y += vy
        if (x <= 0 || x >= W) { vx *= -1; x = Math.max(0, Math.min(W, x)); hue++ }
        if (y <= 0 || y >= H) { vy *= -1; y = Math.max(0, Math.min(H, y)); hue++ }
        b.style.transform = `translate(${x}px,${y}px)`
        b.style.color = BOUNCE_COLOURS[hue % BOUNCE_COLOURS.length]
      }
      raf = requestAnimationFrame(f)
    }
    raf = requestAnimationFrame(f)
    return () => cancelAnimationFrame(raf)
  }, [])

  const mmss = `${pad(Math.floor(t / 60) % 60)}:${pad(t % 60)}`
  const vfd = vfdOverride ?? (disc && screen === 'on' ? `▶ ${pad(n)}  ${mmss}` : 'NO DISC')
  const img = disc ? coverImageUrl(disc) : ''
  const full = Boolean(img) && disc?.image_mode === 'full'

  return (
    <aside className={`rig${hot ? ' hot' : ''}`} ref={rigRef} aria-label="Project player">
      <div className="tv">
        <div className={`screen${screen === 'idle' ? '' : ` ${screen}`}`} ref={screenRef}>
          <div className="idle"><div className="bounce" ref={bounceRef}>NO DISC</div></div>
          <div
            className="play"
            aria-live="polite"
            style={disc ? ({ '--pb': hex(disc.cover_bg), '--pf': hex(disc.cover_fg) } as CSSProperties) : undefined}
          >
            {disc && (
              <>
                <div
                  className={`ident${full ? ' full' : ''}`}
                  style={full ? { backgroundImage: `linear-gradient(rgba(0,0,0,.35),rgba(0,0,0,.55)),url("${img}")` } : undefined}
                >
                  {full ? null : img ? (
                    <img className="art" src={img} alt="" />
                  ) : disc.pattern !== 'none' ? (
                    <svg viewBox="0 0 100 100" aria-hidden="true"
                      dangerouslySetInnerHTML={{ __html: patternSvg(disc.pattern, hex(disc.cover_fg), hex(disc.cover_bg)) }} />
                  ) : null}
                  <div className="it">{disc.title}</div>
                  <button className="tv-btn" onClick={onDetails}>
                    DETAILS{safeUrl(disc.url) ? ' & LINK' : ''} ▸
                  </button>
                </div>
                <div className="osd">
                  <span>▶ PLAY · NO. {pad(n)}</span>
                  <span>{pad(Math.floor(t / 3600))}:{mmss}</span>
                </div>
              </>
            )}
          </div>
          <div className="dropcue"><b>▼</b>DROP TO PLAY</div>
          <div className="scan" />
        </div>
        <div className="tv-chin"><span>{site.tvBrand}</span><i className={`led${screen === 'on' ? ' on' : ''}`} /></div>
      </div>
      <div className="deck">
        <div className="tray"><div className="mouth" ref={mouthRef} /><div className="brand">{site.deckBrand}</div></div>
        <div className="vfd">{vfd}</div>
        <button className="eject" onClick={onEject} aria-label="Eject disc" title="Eject">⏏</button>
      </div>
    </aside>
  )
}
