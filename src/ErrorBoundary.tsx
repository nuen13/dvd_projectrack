import { Component, type ErrorInfo, type ReactNode } from 'react'

/** Shows what went wrong instead of a blank page. A failed lazy chunk (stale deploy) gets one auto-reload. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ProjectRack crashed:', error, info.componentStack)
    const chunkFailed = /dynamically imported module|Importing a module script failed|Failed to fetch/i.test(error.message)
    try {
      if (chunkFailed && !sessionStorage.getItem('pr-reloaded')) {
        sessionStorage.setItem('pr-reloaded', '1')
        location.reload()
      }
    } catch { /* storage blocked: just show the error */ }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div style={{ maxWidth: 560, margin: '12vh auto', padding: 24, font: '14px/1.5 Inter, system-ui, sans-serif', color: '#121212' }}>
        <h1 style={{ font: "400 36px/1 'Instrument Serif', serif", textTransform: 'uppercase' }}>Something broke</h1>
        <p style={{ color: '#6d6a63', margin: '12px 0' }}>The page hit an error. Reloading usually fixes it.</p>
        <pre style={{ whiteSpace: 'pre-wrap', background: '#f4f2ec', border: '1px solid #dedad1', borderRadius: 8, padding: 12, fontSize: 12 }}>
          {this.state.error.message}
        </pre>
        <p style={{ marginTop: 12, display: 'flex', gap: 12 }}>
          <button onClick={() => location.reload()}>Reload</button>
          <a href="/">Go to the shelf</a>
        </p>
      </div>
    )
  }
}
