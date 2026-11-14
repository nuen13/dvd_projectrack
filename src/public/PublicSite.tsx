import { site } from '../site.config'

/** Placeholder until the shelf is ported (build step 3). */
export default function PublicSite() {
  return (
    <header className="site-header">
      <div className="topbar">
        <span>{site.ownerName}</span>
        <span>{site.edition}</span>
      </div>
      <div className="kicker">{site.kicker}</div>
      <h1>{site.headline}</h1>
    </header>
  )
}
