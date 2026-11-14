import type { ReactNode } from 'react'
import { site } from '../site.config'
import { coverImageUrl, coverTag, discVars, hex, pad, type Disc } from './disc'
import { patternSvg } from './patterns'

type FaceDisc = Pick<Disc,
  'title' | 'spine_text' | 'kind' | 'made_for' | 'status' | 'cover_tag' | 'cover_bg' | 'cover_fg' |
  'pattern' | 'spine_wide' | 'thickness' | 'height' | 'image_path' | 'image_mode'>

const markClass = (s: Disc['status']) =>
  s === 'shipped' ? 'out' : s === 'idea' || s === 'planned' ? 'soon' : ''

/** Inner content of a spine. The caller supplies the wrapper (3D face or flat preview). */
export function SpineContent({ disc, n }: { disc: FaceDisc; n: number }) {
  return (
    <>
      <span className="no">{pad(n)}</span>
      <span className="st">{disc.spine_text || disc.title}</span>
      <span className={`mk ${markClass(disc.status)}`} />
    </>
  )
}

function CoverArt({ disc }: { disc: FaceDisc }) {
  const img = coverImageUrl(disc)
  if (img && disc.image_mode === 'full') return null
  if (img) return <img src={img} alt="" />
  if (disc.pattern === 'none') return null
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: patternSvg(disc.pattern, hex(disc.cover_fg), hex(disc.cover_bg)) }}
    />
  )
}

export function Cover({ disc, n, className = '', children }: {
  disc: FaceDisc
  n: number
  className?: string
  children?: ReactNode
}) {
  const img = coverImageUrl(disc)
  const full = Boolean(img) && disc.image_mode === 'full'
  const style = {
    ...discVars(disc),
    ...(full && {
      backgroundImage: `linear-gradient(180deg,rgba(0,0,0,.5),rgba(0,0,0,0) 38%,rgba(0,0,0,0) 58%,rgba(0,0,0,.6)),url("${img}")`,
    }),
  }
  return (
    <div className={`cv${full ? ' full' : ''}${className ? ` ${className}` : ''}`} style={style}>
      <div className="c-top"><span>No. {pad(n)}</span><span>{disc.made_for}</span></div>
      <div className="c-title">{disc.title}</div>
      <div className="c-sub">{disc.kind}</div>
      <div className="c-art"><CoverArt disc={disc} /></div>
      <div className="c-bot"><span>{site.ownerName}</span><span>{coverTag(disc)}</span></div>
      {children}
    </div>
  )
}

export { CoverArt }
