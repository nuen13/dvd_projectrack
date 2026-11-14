import type { CSSProperties, PointerEvent as ReactPointerEvent, RefObject } from 'react'
import { Cover, SpineContent } from '../discs/DiscFaces'
import { coverWidth, discVars, shelfGap, type Disc } from '../discs/disc'

export function Shelf({ discs, status, curId, playingId, liftingId, stageRef, registerSlot, onActivate, onPointerDown }: {
  discs: Disc[]
  status: 'loading' | 'error' | 'ready'
  curId: string | null
  playingId: string | null
  liftingId: string | null
  stageRef: RefObject<HTMLDivElement | null>
  registerSlot(id: string, el: HTMLElement | null): void
  onActivate(id: string): void
  onPointerDown(e: ReactPointerEvent, id: string): void
}) {
  const msg =
    status === 'loading' ? 'Loading the shelf…'
    : status === 'error' ? 'Couldn’t load the shelf. Try again later.'
    : discs.length === 0 ? 'The shelf is being stocked — check back soon.'
    : null

  return (
    <div className="stage" ref={stageRef}>
      <div className="shelf">
        {msg ? <p className="shelf-msg">{msg}</p> : discs.map((d, i) => {
          const cls = ['slot',
            d.id === curId && d.id !== playingId && 'open',
            d.id === playingId && 'out',
            d.id === liftingId && 'lifting',
          ].filter(Boolean).join(' ')
          return (
            <div
              key={d.id}
              className={cls}
              ref={(el) => registerSlot(d.id, el)}
              tabIndex={0}
              role="button"
              aria-label={`${d.title}. Enter to pull out, Enter again to play.`}
              style={{ ...discVars(d), '--w': coverWidth(d.height), '--g': shelfGap(d.thickness) } as CSSProperties}
              onClick={() => onActivate(d.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onActivate(d.id) } }}
              onPointerDown={(e) => onPointerDown(e, d.id)}
              onDragStart={(e) => e.preventDefault()}
            >
              <div className="box">
                <div className="face top" />
                <div className="face pages" />
                <div className="face back" />
                <div className={`face spine sp${d.spine_wide ? ' wide' : ''}`}><SpineContent disc={d} n={i + 1} /></div>
                <Cover disc={d} n={i + 1} className="face cover">
                  <span className="c-play">▶ Tap or drag to play</span>
                </Cover>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
