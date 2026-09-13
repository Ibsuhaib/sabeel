import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { hadithCollection, downloadCollection } from '../lib/data.js'
import { store } from '../lib/store.js'
import { Screen, Header, Loading, LoadError, Card, Button } from '../components/ui.jsx'
import { useData } from '../lib/useData.js'
import Icon from '../components/Icon.jsx'

export default function HadithCollection() {
  const { id } = useParams()
  const { data: c, error, retry } = useData(() => hadithCollection(id), [id], { label: 'this collection' })
  const [q, setQ] = useState('')
  const [offline, setOffline] = useState(false)
  const [progress, setProgress] = useState(null)

  useEffect(() => { store.offlineCollections().then(list => setOffline(list.includes(id))) }, [id])

  const books = useMemo(() => {
    if (!c) return []
    const needle = q.trim().toLowerCase()
    if (!needle) return c.books
    return c.books.filter(b => b.title.toLowerCase().includes(needle) || String(b.n) === needle)
  }, [c, q])

  async function saveOffline() {
    setProgress({ done: 0, total: c.books.length })
    await downloadCollection(id, (done, total) => setProgress({ done, total }))
    await store.markOffline(id)
    setOffline(true)
    setProgress(null)
  }

  if (error) return <LoadError message={error} onRetry={retry} />
  if (!c) return <Loading label="Loading collection" />

  return (
    <Screen>
      <Header title={c.name} subtitle={`${c.author}${c.died ? ` · d. ${c.died}` : ''}`} back />

      <div className="px-4 pt-4">
        <Card className="p-4">
          <div className="flex flex-wrap gap-2 text-[11px]">
            <Stat label="Hadith" value={c.totalHadith.toLocaleString()} />
            <Stat label="Books" value={c.books.length} />
            {c.sahihByCompilation
              ? <Stat label="Status" value="Sahih throughout" tone="emerald" />
              : <Stat label="Graded" value={`${Math.round(c.gradedCount / c.totalHadith * 100)}%`} />}
          </div>

          {c.sahihByCompilation ? (
            <p className="text-xs text-muted mt-3 leading-relaxed">
              Accepted in its entirety by the scholars of hadith. Individual narrations are not
              graded separately here because the compiler's own criteria are the grading.
            </p>
          ) : (
            <p className="text-xs text-muted mt-3 leading-relaxed">
              A Sunan collection: it contains authentic, good and weak narrations together.
              Each hadith below shows its grading and the scholar who gave it.
            </p>
          )}

          <div className="mt-4">
            {offline ? (
              <p className="text-xs text-brand flex items-center gap-1.5">
                <Icon name="check" size={14} />Saved for offline reading
              </p>
            ) : progress ? (
              <div>
                <div className="h-1 bg-line rounded-full overflow-hidden">
                  <div className="h-full bg-brand transition-all" style={{ width: `${progress.done / progress.total * 100}%` }} />
                </div>
                <p className="text-[11px] text-muted mt-2 tabular-nums">
                  Downloading {progress.done} of {progress.total} books…
                </p>
              </div>
            ) : (
              <Button variant="soft" size="sm" onClick={saveOffline}>
                <Icon name="download" size={14} />Save for offline
              </Button>
            )}
          </div>
        </Card>
      </div>

      <div className="px-4 pt-4">
        <input
          value={q} onChange={e => setQ(e.target.value)}
          placeholder={`Find a book in ${c.name}`}
          className="w-full px-4 py-2.5 rounded-xl bg-surf border border-line text-sm outline-none focus:border-brand"
        />
      </div>

      <ul className="mt-3 divide-y divide-line">
        {books.map(b => (
          <li key={b.n}>
            <Link to={`/hadith/${id}/${b.n}`} className="tap flex items-center gap-3 px-4 py-3 active:bg-surf">
              <span className="w-8 text-xs tabular-nums text-muted shrink-0">{b.n}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] truncate">{b.title}</span>
                <span className="block text-xs text-muted mt-0.5 tabular-nums">{b.count} hadith</span>
              </span>
              <Icon name="forward" size={18} className="text-muted shrink-0" />
            </Link>
          </li>
        ))}
        {books.length === 0 && <li className="px-4 py-10 text-center text-sm text-muted">No book matches “{q}”.</li>}
      </ul>
    </Screen>
  )
}

function Stat({ label, value, tone }) {
  return (
    <span className={`px-2.5 py-1 rounded-lg border ${
      tone === 'emerald' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-bg border-line text-muted'
    }`}>
      <span className="opacity-60">{label} </span>
      <strong className="font-semibold tabular-nums">{value}</strong>
    </span>
  )
}
