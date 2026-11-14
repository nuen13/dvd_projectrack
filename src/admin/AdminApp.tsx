import { Link, Route, Routes } from 'react-router-dom'
import { site } from '../site.config'
import { signInWithGitHub, signOut, useIsOwner, useSession } from './auth'
import { DiscTable } from './DiscTable'
import './admin.css'

/** Owner-only area (ADR-0003, ADR-0005). The UI gate is for UX; RLS is what actually protects the data. */
export default function AdminApp() {
  const session = useSession()
  const owner = useIsOwner(session?.user.id)

  if (session === undefined || (session && owner.isLoading)) {
    return <Shell><p className="ad-muted">Checking sign-in…</p></Shell>
  }
  if (!session) {
    return (
      <Shell>
        <div className="ad-card ad-center">
          <h2>Owner sign-in</h2>
          <p className="ad-muted">Admin is for the shelf’s owner only.</p>
          <button className="ad-btn ad-primary" onClick={() => void signInWithGitHub()}>Sign in with GitHub</button>
        </div>
      </Shell>
    )
  }
  if (owner.isError || !owner.data) {
    return (
      <Shell email={session.user.email}>
        <div className="ad-card ad-center">
          <h2>Not the owner</h2>
          <p className="ad-muted">
            {owner.isError ? 'Couldn’t check ownership. Try again.' : `${session.user.email ?? 'This account'} can’t edit this shelf.`}
          </p>
          <button className="ad-btn" onClick={() => void signOut()}>Sign out</button>
        </div>
      </Shell>
    )
  }
  return (
    <Shell email={session.user.email} signedIn>
      <Routes>
        <Route index element={<DiscTable />} />
        <Route path="discs/:id" element={<EditorPlaceholder />} />
      </Routes>
    </Shell>
  )
}

function Shell({ children, email, signedIn }: { children: React.ReactNode; email?: string | null; signedIn?: boolean }) {
  return (
    <div className="admin">
      <header className="ad-top">
        <Link to="/admin" className="ad-brand">{site.kicker} · <b>Admin</b></Link>
        <nav>
          <a href="/" target="_blank" rel="noopener">View site ↗</a>
          {email && <span className="ad-muted">{email}</span>}
          {signedIn && <button className="ad-btn ad-small" onClick={() => void signOut()}>Sign out</button>}
        </nav>
      </header>
      <main className="ad-main">{children}</main>
    </div>
  )
}

function EditorPlaceholder() {
  return (
    <div className="ad-card">
      <p>The disc editor arrives in build step 5.</p>
      <Link to="/admin">← Back to discs</Link>
    </div>
  )
}
