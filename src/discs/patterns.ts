/**
 * Cover patterns, ported verbatim from the prototype. Returns SVG inner markup for a
 * 100x100 viewBox. Colours must already be sanitised with hex(); nothing else is user input.
 */
export const PATTERNS = [
  'rings', 'checks', 'grid', 'bubbles', 'candles', 'chart',
  'lock', 'brackets', 'dots', 'nodes', 'stripes', 'none',
] as const
export type Pattern = (typeof PATTERNS)[number]

export function patternSvg(m: string, c: string, bg: string): string {
  const s = `stroke="${c}" fill="none" stroke-width="2"`
  switch (m) {
    case 'rings':
      return [...Array(7)].map((_, i) => `<circle cx="50" cy="50" r="${6 + i * 6.5}" ${s} opacity="${1 - i * 0.11}"/>`).join('') +
        `<circle cx="50" cy="50" r="4" fill="${c}"/>`
    case 'checks':
      return [0, 1, 2, 3].map((i) =>
        `<rect x="14" y="${16 + i * 19}" width="11" height="11" ${s}/>` +
        (i < 2 ? `<path d="M16 ${21 + i * 19}l3 3 5-6" ${s}/>` : '') +
        `<line x1="34" y1="${21.5 + i * 19}" x2="${86 - i * 9}" y2="${21.5 + i * 19}" ${s} ${i < 2 ? 'opacity=".45"' : ''}/>`).join('')
    case 'grid': {
      let o = ''
      for (let r = 0; r < 5; r++)
        for (let k = 0; k < 7; k++) {
          const f = r === 2 && k === 4
          o += `<rect x="${8 + k * 12.3}" y="${20 + r * 12.3}" width="9" height="9" ${f ? `fill="${c}"` : s} ${f ? '' : 'stroke-width="1.4"'}/>`
        }
      return o
    }
    case 'bubbles':
      return `<rect x="10" y="18" width="56" height="34" rx="10" ${s}/><path d="M22 52l-4 12 14-12" ${s}/><rect x="36" y="56" width="54" height="28" rx="10" fill="${c}"/><circle cx="54" cy="70" r="2.5" fill="${bg}"/><circle cx="63" cy="70" r="2.5" fill="${bg}"/><circle cx="72" cy="70" r="2.5" fill="${bg}"/>`
    case 'candles': {
      const d = [[48, 30, 62, 20, 70], [60, 44, 52, 36, 62], [52, 40, 58, 30, 66], [64, 48, 60, 38, 72], [56, 34, 44, 26, 52], [42, 26, 36, 18, 46], [38, 22, 30, 14, 42]]
      return d.map((v, i) => {
        const x = 14 + i * 12, up = v[1] < v[0]
        return `<line x1="${x}" y1="${v[3] + 20}" x2="${x}" y2="${v[4] + 20}" stroke="${c}" stroke-width="1.5"/><rect x="${x - 4}" y="${Math.min(v[0], v[2]) + 20}" width="8" height="${Math.abs(v[0] - v[2]) || 2}" ${up ? `fill="${c}"` : s}/>`
      }).join('')
    }
    case 'chart':
      return `<polyline points="8,78 20,66 30,70 42,48 54,56 64,34 76,40 92,16" ${s} stroke-width="3"/><line x1="8" y1="86" x2="92" y2="86" ${s} opacity=".4"/><circle cx="92" cy="16" r="4" fill="${c}"/>`
    case 'lock':
      return `<path d="M34 46V34a16 16 0 0 1 32 0v12" ${s} stroke-width="5"/><rect x="24" y="46" width="52" height="40" rx="6" fill="${c}"/><circle cx="50" cy="63" r="5" fill="${bg}"/><rect x="48" y="64" width="4" height="12" fill="${bg}"/>`
    case 'brackets':
      return `<text x="50" y="66" text-anchor="middle" font-family="Instrument Serif,serif" font-size="58" fill="${c}">{ ; }</text>`
    case 'dots': {
      let o = ''
      for (let r = 0; r < 6; r++) for (let k = 0; k < 6; k++) o += `<circle cx="${17 + k * 13}" cy="${17 + r * 13}" r="${(r + k) % 5 === 0 ? 4.5 : 2}" fill="${c}"/>`
      return o
    }
    case 'nodes': {
      const n = [[20, 30], [50, 18], [80, 32], [30, 62], [64, 58], [50, 86], [86, 74]]
      const e = [[0, 1], [1, 2], [0, 3], [1, 4], [2, 4], [3, 4], [3, 5], [4, 5], [4, 6], [2, 6]]
      return e.map(([a, b]) => `<line x1="${n[a][0]}" y1="${n[a][1]}" x2="${n[b][0]}" y2="${n[b][1]}" stroke="${c}" stroke-width="1.2" opacity=".6"/>`).join('') +
        n.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i === 4 ? 6 : 3.5}" fill="${c}"/>`).join('')
    }
    case 'stripes':
      return [...Array(9)].map((_, i) => `<line x1="${-10 + i * 14}" y1="92" x2="${30 + i * 14}" y2="8" stroke="${c}" stroke-width="${i % 3 === 1 ? 5 : 1.5}"/>`).join('')
  }
  return ''
}
