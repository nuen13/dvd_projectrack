import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { useShowcasedDiscs } from '../discs/useShowcasedDiscs'
import type { Disc } from '../discs/disc'
import { site } from '../site.config'
import { fly, makeGhost, nextFrame, place, wait, type Ghost, type Pt } from './ghost'
import { NowPlaying } from './NowPlaying'
import { Player, type ScreenMode } from './Player'
import { Shelf } from './Shelf'
import './shelf.css'

interface Drag { id: string; x0: number; y0: number; x: number; y: number; started: boolean; touch: boolean; g?: Ghost }

const EMPTY: Disc[] = []

/**
 * The public shelf: pull a disc out, play it in the TV, read about it.
 * Faithful port of the prototype (ADR-0006). Animations stay imperative (Web Animations API);
 * React owns which disc is open / playing.
 */
export default function PublicSite() {
  const { data, isLoading, isError } = useShowcasedDiscs()
  const discs = data ?? EMPTY

  const [curId, setCurId] = useState<string | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [screenDiscId, setScreenDiscId] = useState<string | null>(null)
  const [liftingId, setLiftingId] = useState<string | null>(null)
  const [screen, setScreen] = useState<ScreenMode>('idle')
  const [vfdOverride, setVfdOverride] = useState<string | null>(null)
  const [hot, setHot] = useState(false)
  const [popOpen, setPopOpen] = useState(false)

  const stageRef = useRef<HTMLDivElement>(null)
  const rigRef = useRef<HTMLElement>(null)
  const mouthRef = useRef<HTMLDivElement>(null)
  const slotEls = useRef(new Map<string, HTMLElement>())
  const busy = useRef(false)
  const suppressClick = useRef(false)
  const drag = useRef<Drag | null>(null)
  const popTimer = useRef<number | undefined>(undefined)

  // Latest state for async animation code and window listeners.
  const live = useRef({ discs, curId, playingId, popOpen })
  useLayoutEffect(() => { live.current = { discs, curId, playingId, popOpen } })

  const registerSlot = useCallback((id: string, el: HTMLElement | null) => {
    if (el) slotEls.current.set(id, el)
    else slotEls.current.delete(id)
  }, [])

  const indexOf = (id: string | null) => live.current.discs.findIndex((d) => d.id === id)

  function centre(id: string | null, instant: boolean) {
    const s = id ? slotEls.current.get(id) : null, st = stageRef.current
    if (!s || !st || st.scrollWidth <= st.clientWidth) return
    const sr = s.getBoundingClientRect(), tr = st.getBoundingClientRect()
    st.scrollTo({ left: st.scrollLeft + sr.left - tr.left + sr.width / 2 - st.clientWidth / 2, behavior: instant ? 'auto' : 'smooth' })
  }
  function slotCentre(id: string): Pt {
    const s = slotEls.current.get(id)
    if (!s) return [innerWidth / 2, innerHeight / 2]
    const r = s.getBoundingClientRect()
    return [r.left + r.width / 2, r.bottom - r.height * 0.45]
  }
  function mouthCentre(): Pt {
    const r = mouthRef.current!.getBoundingClientRect()
    return [r.left + r.width / 2, r.top + r.height / 2]
  }
  function overRig(x: number, y: number) {
    const r = rigRef.current?.getBoundingClientRect()
    return !!r && x > r.left - 30 && x < r.right + 30 && y > r.top - 30 && y < r.bottom + 30
  }

  function openCover(id: string) {
    setCurId(id)
    setTimeout(() => centre(id, false), 420)
  }
  function step(dir: 1 | -1) {
    const { discs, curId, playingId } = live.current
    const n = discs.length
    if (!n) return
    let i = Math.max(0, indexOf(curId))
    for (let k = 0; k < n; k++) {
      i = (i + dir + n) % n
      if (discs[i].id !== playingId) break
    }
    openCover(discs[i].id)
  }
  function activate(id: string) {
    if (suppressClick.current) return
    const { curId, playingId } = live.current
    if (id === playingId) void eject()
    else if (id === curId) void insert(id)
    else openCover(id)
  }

  async function insert(id: string, g?: Ghost, from?: Pt) {
    if (busy.current) {
      g?.dispose()
      setLiftingId(null)
      return
    }
    busy.current = true
    try {
      const playing = live.current.playingId
      if (playing && playing !== id) await eject(true)
      const i = indexOf(id), disc = live.current.discs[i]
      if (!disc) return
      setLiftingId(id)
      if (!g) {
        g = makeGhost(disc, i + 1)
        from = slotCentre(id)
        place(g.el, ...from)
        await nextFrame()
      }
      g.el.classList.remove('peek')
      setVfdOverride('LOADING')
      await fly(g.el, from!, mouthCentre(), { r0: 0, s1: 0.12, o1: 0.15, d: 560 })
      g.dispose()
      setPlayingId(id)
      setScreenDiscId(id)
      setCurId((c) => (c === id ? null : c))
      setLiftingId(null)
      mouthRef.current?.animate(
        [{ boxShadow: 'inset 0 2px 3px #000,0 0 0 1.5px #c6f36a,0 0 22px #c6f36a' }, { boxShadow: 'inset 0 2px 3px #000' }],
        { duration: 700 },
      )
      await wait(380)
      setVfdOverride(null)
      setScreen('on')
      clearTimeout(popTimer.current)
      popTimer.current = window.setTimeout(() => { if (live.current.playingId === id) setPopOpen(true) }, 1100)
    } finally {
      busy.current = false
    }
  }

  async function eject(internal = false) {
    const id = live.current.playingId
    if (!id) return
    if (!internal) {
      if (busy.current) return
      busy.current = true
    }
    try {
      clearTimeout(popTimer.current)
      setPopOpen(false)
      setVfdOverride('OPEN')
      setScreen('off')
      await wait(380)
      setScreen('idle')
      setScreenDiscId(null)
      const i = indexOf(id), disc = live.current.discs[i]
      if (disc && slotEls.current.has(id)) {
        const g = makeGhost(disc, i + 1), m = mouthCentre()
        place(g.el, ...m, 0, 0.12)
        await fly(g.el, m, slotCentre(id), { s0: 0.12, r0: 0, d: 560 })
        g.dispose()
      }
      setPlayingId(null)
      live.current.playingId = null
      setVfdOverride(null)
    } finally {
      if (!internal) busy.current = false
    }
  }

  function onPointerDown(e: ReactPointerEvent, id: string) {
    if (e.button !== 0 || busy.current || id === live.current.playingId) return
    drag.current = { id, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, started: false, touch: e.pointerType === 'touch' }
  }
  function onPointerMove(e: PointerEvent) {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.x0, dy = e.clientY - d.y0
    if (!d.started) {
      if (Math.hypot(dx, dy) < 9) return
      if (d.touch && Math.abs(dx) > Math.abs(dy)) { drag.current = null; return } // horizontal swipe = scroll the shelf
      const i = indexOf(d.id)
      d.started = true
      d.g = makeGhost(live.current.discs[i], i + 1)
      setLiftingId(d.id)
      const g = d.g
      requestAnimationFrame(() => g.el.classList.add('peek'))
    }
    e.preventDefault()
    d.x = e.clientX
    d.y = e.clientY
    place(d.g!.el, e.clientX, e.clientY, Math.max(-14, Math.min(14, dx * 0.04)))
    setHot(overRig(e.clientX, e.clientY))
  }
  function endDrag(e: PointerEvent, cancel: boolean) {
    const d = drag.current
    drag.current = null
    if (!d || !d.started) return
    suppressClick.current = true
    setTimeout(() => { suppressClick.current = false }, 0)
    setHot(false)
    const g = d.g!
    if (!cancel && overRig(e.clientX, e.clientY)) void insert(d.id, g, [e.clientX, e.clientY])
    else {
      g.el.classList.remove('peek')
      void fly(g.el, [d.x, d.y], slotCentre(d.id), { r0: 0, d: 420 }).then(() => { g.dispose(); setLiftingId(null) })
    }
  }
  function onKeyDown(e: KeyboardEvent) {
    if (live.current.popOpen) return
    const t = e.target as HTMLElement | null
    if (t?.closest?.('input,textarea,select')) return
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1) }
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1) }
  }

  // Window listeners call the latest handlers through a ref.
  const handlers = useRef({ onPointerMove, endDrag, onKeyDown, centre })
  useLayoutEffect(() => { handlers.current = { onPointerMove, endDrag, onKeyDown, centre } })
  useEffect(() => {
    const mv = (e: PointerEvent) => handlers.current.onPointerMove(e)
    const up = (e: PointerEvent) => handlers.current.endDrag(e, false)
    const cancel = (e: PointerEvent) => handlers.current.endDrag(e, true)
    const key = (e: KeyboardEvent) => handlers.current.onKeyDown(e)
    const scale = () => {
      const w = innerWidth, avail = w > 1060 ? w - 480 : w
      document.documentElement.style.setProperty('--s', Math.max(0.6, Math.min(1, avail / 1080)).toFixed(3))
    }
    const resize = () => { scale(); handlers.current.centre(live.current.curId, true) }
    scale()
    window.addEventListener('pointermove', mv, { passive: false })
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
    window.addEventListener('keydown', key)
    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('pointermove', mv)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cancel)
      window.removeEventListener('keydown', key)
      window.removeEventListener('resize', resize)
      clearTimeout(popTimer.current)
    }
  }, [])

  // Pull out the middle disc once the shelf loads.
  const opened = useRef(false)
  useEffect(() => {
    if (opened.current || discs.length === 0) return
    opened.current = true
    const mid = discs[Math.floor(discs.length / 2)].id
    setCurId(mid)
    setTimeout(() => handlers.current.centre(mid, true), 60)
  }, [discs])

  const screenIdx = discs.findIndex((d) => d.id === screenDiscId)
  const playingIdx = discs.findIndex((d) => d.id === playingId)

  return (
    <>
      <header>
        <div className="topbar"><span>{site.ownerName}</span><span>{site.edition}</span></div>
        <div className="kicker">{site.kicker}</div>
        <h1>{site.headline}</h1>
      </header>
      <div className="main">
        <section className="left">
          <Shelf
            discs={discs}
            status={isLoading ? 'loading' : isError ? 'error' : 'ready'}
            curId={curId}
            playingId={playingId}
            liftingId={liftingId}
            stageRef={stageRef}
            registerSlot={registerSlot}
            onActivate={activate}
            onPointerDown={onPointerDown}
          />
          <div className="ledge" />
          <div className="shelf-bar">
            <span className="shelf-hint">Tap a spine to pull it out · drag it into the player</span>
          </div>
        </section>
        <Player
          disc={screenIdx > -1 ? discs[screenIdx] : null}
          n={screenIdx + 1}
          screen={screen}
          vfdOverride={vfdOverride}
          hot={hot}
          rigRef={rigRef}
          mouthRef={mouthRef}
          onEject={() => void eject()}
          onDetails={() => setPopOpen(true)}
        />
      </div>
      {popOpen && playingIdx > -1 && (
        <NowPlaying
          disc={discs[playingIdx]}
          n={playingIdx + 1}
          onClose={() => setPopOpen(false)}
          onEject={() => void eject()}
        />
      )}
    </>
  )
}
