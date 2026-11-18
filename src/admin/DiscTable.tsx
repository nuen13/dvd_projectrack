import { useState, type CSSProperties, type DragEvent } from 'react'
import { Link } from 'react-router-dom'
import { SpineContent } from '../discs/DiscFaces'
import { STATUS_LABEL, type DiscRow, type DiscStatus } from '../discs/disc'
import { useAllDiscs, useCreateDisc, useReorderDiscs, useUpdateDisc, withShippedDate } from './discsApi'

const STATUSES = Object.keys(STATUS_LABEL) as DiscStatus[]
const isShowcased = (d: DiscRow) => d.status === 'shipped' && d.is_public

export function DiscTable() {
  const { data: discs = [], isLoading, isError } = useAllDiscs()
  const update = useUpdateDisc()
  const reorder = useReorderDiscs()
  const create = useCreateDisc()
  const [filter, setFilter] = useState<DiscStatus | 'all'>('all')
  const [dragId, setDragId] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [newStatus, setNewStatus] = useState<DiscStatus>('idea')

  if (isLoading) return <p className="rk-muted">Loading discs…</p>
  if (isError) return <p className="rk-err">Couldn’t load discs.</p>

  const counts = Object.fromEntries(STATUSES.map((s) => [s, discs.filter((d) => d.status === s).length]))
  const showcased = discs.filter(isShowcased).length
  const rows = filter === 'all' ? discs : discs.filter((d) => d.status === filter)
  const canDrag = filter === 'all'

  function onDrop(e: DragEvent, targetId: string) {
    e.preventDefault()
    if (!dragId || dragId === targetId) return setDragId(null)
    const list = [...discs]
    const from = list.findIndex((d) => d.id === dragId)
    const [moved] = list.splice(from, 1)
    list.splice(list.findIndex((d) => d.id === targetId) + (from <= list.findIndex((d) => d.id === targetId) ? 1 : 0), 0, moved)
    setDragId(null)
    reorder.mutate(list)
  }
  function move(id: string, dir: -1 | 1) {
    const list = [...discs]
    const i = list.findIndex((d) => d.id === id), j = i + dir
    if (j < 0 || j >= list.length) return
    ;[list[i], list[j]] = [list[j], list[i]]
    reorder.mutate(list)
  }
  function addDisc(e: React.FormEvent) {
    e.preventDefault()
    const title = newTitle.trim()
    if (!title) return
    create.mutate({ title, status: newStatus, position: discs.length }, { onSuccess: () => setNewTitle('') })
  }

  return (
    <>
      <div className="rk-head">
        <h1>Discs</h1>
        <p className="rk-muted">
          {discs.length} total · <b>{showcased}</b> showcased on the public site (Shipped + Public)
        </p>
      </div>

      <div className="rk-filters" role="group" aria-label="Filter by status">
        <button aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>All {discs.length}</button>
        {STATUSES.map((s) => (
          <button key={s} aria-pressed={filter === s} onClick={() => setFilter(s)}>
            {STATUS_LABEL[s]} {counts[s]}
          </button>
        ))}
      </div>

      <form className="rk-new" onSubmit={addDisc}>
        <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} maxLength={60} placeholder="New disc title" aria-label="New disc title" />
        <select value={newStatus} onChange={(e) => setNewStatus(e.target.value as DiscStatus)} aria-label="New disc status">
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <button className="rk-btn rk-primary" disabled={!newTitle.trim() || create.isPending}>＋ Quick add</button>
        <Link className="rk-btn" to="/admin/discs/new">Open full editor</Link>
        {create.isError && <span className="rk-err">Couldn’t add the disc.</span>}
      </form>

      {(update.isError || reorder.isError) && <p className="rk-err">A change didn’t save and was undone. Try again.</p>}

      {rows.length === 0 ? (
        <p className="rk-muted rk-empty">{discs.length === 0 ? 'No discs yet — add your first one above.' : 'No discs with this status.'}</p>
      ) : (
        <div className="rk-tablewrap">
          <table className="rk-table">
            <thead>
              <tr>
                <th aria-label="Order" />
                <th>#</th>
                <th aria-label="Spine" />
                <th>Disc</th>
                <th>Status</th>
                <th>Public</th>
                <th>Shipped on</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => {
                const n = discs.indexOf(d) + 1
                return (
                  <tr
                    key={d.id}
                    className={dragId === d.id ? 'dragging' : undefined}
                    draggable={canDrag}
                    onDragStart={() => setDragId(d.id)}
                    onDragEnd={() => setDragId(null)}
                    onDragOver={(e) => canDrag && e.preventDefault()}
                    onDrop={(e) => onDrop(e, d.id)}
                  >
                    <td className="rk-order">
                      {canDrag && (
                        <>
                          <span className="rk-grip" aria-hidden="true">⋮⋮</span>
                          <button className="rk-icon" onClick={() => move(d.id, -1)} disabled={n === 1} aria-label={`Move ${d.title} left on shelf`}>↑</button>
                          <button className="rk-icon" onClick={() => move(d.id, 1)} disabled={n === discs.length} aria-label={`Move ${d.title} right on shelf`}>↓</button>
                        </>
                      )}
                    </td>
                    <td className="rk-num">{String(n).padStart(2, '0')}</td>
                    <td>
                      <div className={`rk-spine sp${d.spine_wide ? ' wide' : ''}`}
                        style={{ '--t': d.thickness, '--h': d.height, '--cb': d.cover_bg, '--cf': d.cover_fg } as CSSProperties}>
                        <SpineContent disc={d} n={n} />
                      </div>
                    </td>
                    <td>
                      <div className="rk-title">{d.title}</div>
                      <div className="rk-muted rk-sub">{[d.made_for, d.kind].filter(Boolean).join(' · ') || '—'}</div>
                    </td>
                    <td>
                      <select
                        className={`rk-status s-${d.status}`}
                        value={d.status}
                        aria-label={`Status of ${d.title}`}
                        onChange={(e) => update.mutate({ id: d.id, patch: withShippedDate({ status: e.target.value as DiscStatus }, d) })}
                      >
                        {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                      </select>
                    </td>
                    <td>
                      <label className="rk-toggle">
                        <input
                          type="checkbox"
                          checked={d.is_public}
                          onChange={(e) => update.mutate({ id: d.id, patch: { is_public: e.target.checked } })}
                          aria-label={`Show ${d.title} publicly`}
                        />
                        <span>{isShowcased(d) ? 'Live' : d.is_public ? 'Public · not shipped' : 'Hidden'}</span>
                      </label>
                    </td>
                    <td className="rk-muted">{d.shipped_on ?? '—'}</td>
                    <td><Link className="rk-btn rk-small" to={`/admin/discs/${d.id}`}>Edit</Link></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {canDrag && discs.length > 1 && <p className="rk-muted rk-hint">Drag rows (or use ↑ ↓) to set the shelf order. Top row = left end of the shelf.</p>}
    </>
  )
}
