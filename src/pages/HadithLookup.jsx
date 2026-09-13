import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { hadithIndex, findHadith } from '../lib/data.js'
import { store } from '../lib/store.js'
import { Screen, Header, Card, Loading, Button, Empty } from '../components/ui.jsx'
import HadithCard from '../components/HadithCard.jsx'
import Icon from '../components/Icon.jsx'

// "I have a reference, show me the hadith." Every printed collection and every
// citation in a book gives a number — this is how you use one.
//
// Accepts a bare number with a chosen collection, or a typed reference like
// "bukhari 1302", "abu dawud 1", "muslim 2564".
export default function HadithLookup() {
  const [params, setParams] = useSearchParams()
  const nav = useNavigate()

  const [idx, setIdx] = useState(null)
  const [collection, setCollection] = useState(params.get('c') || 'bukhari')
  const [number, setNumber] = useState(params.get('n') || '')
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [bookmarks, setBookmarks] = useState([])

  useEffect(() => { hadithIndex().then(setIdx) }, [])
  useEffect(() => { store.bookmarksHadith().then(setBookmarks) }, [])

  const current = useMemo(() => idx?.collections.find(c => c.id === collection), [idx, collection])

  async function lookup(c = collection, n = number) {
    const num = Number(String(n).trim())
    if (!num) { setError('Enter a hadith number.'); return }
    const meta = idx.collections.find(x => x.id === c)
    if (num < 1 || num > meta.totalHadith) {
      setError(`${meta.name} has ${meta.totalHadith.toLocaleString()} narrations — ${num} is outside that.`)
      setResult(null)
      return
    }
    setBusy(true)
    setError(null)
    setParams({ c, n: String(num) }, { replace: true })
    const found = await findHadith(c, num)
    setBusy(false)
    if (!found) { setError(`No hadith numbered ${num} in ${meta.name}.`); setResult(null); return }
    setResult(found)
  }

  // A typed reference beats picking from a dropdown when you already know it.
  function parseAndLookup(text) {
    const m = String(text).trim().match(/^(.*?)[\s:#-]*(\d+)$/)
    if (!m) return false
    const [, namePart, num] = m
    const name = namePart.trim().toLowerCase().replace(/[^a-z]/g, '')
    if (!name) return false
    const match = idx.collections.find(c =>
      c.id.startsWith(name) ||
      name.startsWith(c.id) ||
      c.name.toLowerCase().replace(/[^a-z]/g, '').includes(name)
    )
    if (!match) return false
    setCollection(match.id)
    setNumber(num)
    lookup(match.id, num)
    return true
  }

  useEffect(() => {
    if (idx && params.get('n')) lookup(params.get('c') || 'bukhari', params.get('n'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx])

  if (!idx) return <Loading />

  return (
    <Screen>
      <Header title="Find by reference" subtitle="Look up a hadith by its number" back />

      <div className="px-4 pt-4">
        <Card className="p-4">
          <label className="block text-[11px] text-muted mb-1.5">Type a reference</label>
          <div className="flex gap-2">
            <input
              value={params.get('ref') ?? ''} onChange={e => setParams({ ref: e.target.value }, { replace: true })}
              onKeyDown={e => {
                if (e.key !== 'Enter') return
                if (!parseAndLookup(e.currentTarget.value)) setError('Could not read that. Try “bukhari 1302” or use the picker below.')
              }}
              placeholder="e.g. bukhari 1302"
              className="flex-1 px-4 py-2.5 rounded-xl bg-bg border border-line text-sm outline-none focus:border-brand"
            />
          </div>
          <p className="text-[11px] text-muted mt-2">Press Enter. Or pick a collection and number below.</p>

          <div className="mt-4 pt-4 border-t border-line">
            <label className="block text-[11px] text-muted mb-1.5">Collection</label>
            <select
              value={collection}
              onChange={e => { setCollection(e.target.value); setResult(null); setError(null) }}
              className="w-full px-3 py-2.5 rounded-xl bg-bg border border-line text-sm outline-none focus:border-brand"
            >
              {idx.collections.map(c => (
                <option key={c.id} value={c.id}>{c.name} — {c.totalHadith.toLocaleString()} hadith</option>
              ))}
            </select>

            <label className="block text-[11px] text-muted mt-3 mb-1.5">
              Hadith number {current && <span className="opacity-60">(1–{current.totalHadith.toLocaleString()})</span>}
            </label>
            <div className="flex gap-2">
              <input
                type="number" min={1} max={current?.totalHadith} value={number}
                onChange={e => setNumber(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && lookup()}
                placeholder="1302"
                className="flex-1 px-4 py-2.5 rounded-xl bg-bg border border-line text-sm tabular-nums outline-none focus:border-brand"
              />
              <Button onClick={() => lookup()} disabled={busy}>
                {busy ? 'Finding…' : 'Find'}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {error && (
        <div className="px-4 mt-3">
          <Card className="px-4 py-3 flex gap-2 border-amber-500/40">
            <Icon name="warn" size={15} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-muted flex-1">{error}</p>
          </Card>
        </div>
      )}

      {busy && <Loading label="Searching the collection" />}

      {result && !busy && (
        <div className="mt-4">
          <p className="px-4 text-[11px] text-muted mb-1">
            {result.collection.name} · {result.book.title}
          </p>
          <HadithCard
            hadith={result.hadith}
            collection={result.collection}
            book={result.book}
            bookmarked={bookmarks.some(b => b.id === `${result.collection.id}:${result.hadith.n}`)}
            onBookmark={async () => setBookmarks(
              await store.toggleHadithBookmark(
                result.collection.id, result.book.n, result.hadith.n,
                result.hadith.en.slice(0, 140), result.collection.name
              )
            )}
          />
          <div className="px-4 py-4">
            <Button
              variant="soft" size="lg"
              onClick={() => nav(`/hadith/${result.collection.id}/${result.book.n}?n=${result.hadith.n}`)}
            >
              <Icon name="book" size={15} />Read it in context
            </Button>
          </div>
        </div>
      )}

      {!result && !busy && !error && (
        <Empty
          icon="search"
          title="Check a reference"
          body="Someone quotes “Bukhari 1302” at you. Put the number in and read the narration yourself, with its grading and its full chapter reference."
        />
      )}
    </Screen>
  )
}
