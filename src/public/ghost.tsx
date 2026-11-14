import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { Cover } from '../discs/DiscFaces'
import type { Disc } from '../discs/disc'

/** Imperative helpers for the disc "ghost" that flies between shelf and player (ported from the prototype). */
export type Pt = [number, number]
export interface Ghost { el: HTMLDivElement; dispose(): void }

export function makeGhost(disc: Disc, n: number): Ghost {
  const el = document.createElement('div')
  el.className = 'ghost'
  document.body.appendChild(el)
  const root = createRoot(el)
  flushSync(() => root.render(<><div className="g-disc" /><Cover disc={disc} n={n} /></>))
  return {
    el,
    dispose() {
      el.remove()
      setTimeout(() => root.unmount())
    },
  }
}

export function place(el: HTMLElement, x: number, y: number, r = 0, sc = 1) {
  el.style.transform = `translate(${x - 64}px,${y - 88}px) rotate(${r}deg) scale(${sc})`
}

export function fly(el: HTMLElement, from: Pt, to: Pt, o: { r0?: number; r1?: number; s0?: number; s1?: number; o1?: number; d?: number } = {}) {
  return el.animate(
    [
      { transform: `translate(${from[0] - 64}px,${from[1] - 88}px) rotate(${o.r0 ?? -6}deg) scale(${o.s0 ?? 1})`, opacity: 1 },
      { transform: `translate(${to[0] - 64}px,${to[1] - 88}px) rotate(${o.r1 ?? 0}deg) scale(${o.s1 ?? 1})`, opacity: o.o1 ?? 1 },
    ],
    { duration: o.d || 520, easing: 'cubic-bezier(.6,0,.2,1)', fill: 'forwards' },
  ).finished
}

export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
export const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))
