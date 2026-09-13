import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { searchQuran, searchHadith, searchDua, snippet } from '../lib/search.js'
import { duaIndex } from '../lib/data.js'
import { Screen, Header, Card, Empty } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'

// Part 3.10(d) — one box across Quran, hadith and dua. Sounds obvious.
// Nobody ships it.
const TABS = [
  { id: 'all', label: 'All' },
  { id: 'quran', label: 'Quran' },
  { id: 'hadith', label: 'Hadith' },
  { id: 'dua', label: 'Dua' }
]

export default function Search() {
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(params.get('q') || '')
  const [tab, setTab] = useState(params.get('tab') || 'all')
  const [results, setResults] = useState(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(null)
  const [duaTitles, setDuaTitles] = useState({})
  const inputRef = useRef(null)
  const runId = useRef(0)

  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => {
    duaIndex().then(i => setDuaTitles(Object.fromEntries(i.categories.map(c => [c.slug, c.title]))))
  }, [])

  useEffect(() => {
    const needle = q.trim()
    if (needle.length < 2) { setResults(null); setBusy(false); return }

    const id = ++runId.current
    setBusy(true)
    const timer = setTimeout(async () => {
      const phrase = needle.toLowerCase()
      const out = { phrase, quran: [], hadith: [], dua: [] }

      if (tab === 'all' || tab === 'quran') out.quran = await searchQuran(needle, tab === 'quran' ? 100 : 20)
      if (tab === 'all' || tab === 'dua') out.dua = await searchDua(needle, tab === 'dua' ? 50 : 8)
      if (id !== runId.current) return
      setResults({ ...out })

      if (tab === 'all' || tab === 'hadith') {
        out.hadith = await searchHadith(needle, null, tab === 'hadith' ? 100 : 20, (d, t) => setProgress({ d, t }))
      }
      if (id !== runId.current) return
      setResults({ ...out })
      setProgress(null)
      setBusy(false)
    }, 280)

    return () => clearTimeout(timer)
  }, [q, tab])

  function update(next) {
    setQ(next)
    setParams(next ? { q: next, tab } : { tab }, { replace: true })
  }

  const total = results ? results.quran.length + results.hadith.length + results.dua.length : 0

  return (
    <Screen>
      <Header title="Search" back />

      <div className="px-4 pt-3">
        <div className="relative">
          <Icon name="search" size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            ref={inputRef} value={q} onChange={e => update(e.target.value)}
            placeholder="Search Quran, hadith and dua together"
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-surf border border-line text-sm outline-none focus:border-brand"
          />
        </div>

        <div className="flex gap-2 mt-3">
          {TABS.map(t => (
            <button
              key={t.id} onClick={() => { setTab(t.id); setParams({ q, tab: t.id }, { replace: true }) }}
              className={`tap chip px-3.5 py-1.5 rounded-full text-xs border transition-colors ${
                tab === t.id ? 'border-brand bg-brand/10 text-brand' : 'border-line text-muted'
              }`}
            >{t.label}</button>
          ))}
        </div>
      </div>

      {q.trim().length < 2 ? (
        <Empty
          icon="search"
          title="One box, three sources"
          body="Search “patience” and you get the ayahs, the graded hadith, and the dua for hardship — together. Everything runs on this device."
        />
      ) : !results ? (
        <p className="text-center text-sm text-muted py-16">Searching…</p>
      ) : total === 0 && !busy ? (
        <Empty icon="search" title="Nothing found" body={`No match for “${q}” in the Quran, hadith or dua.`} />
      ) : (
        <div className="mt-4">
          <p className="px-4 text-[11px] text-muted mb-2">
            {total} result{total === 1 ? '' : 's'}
            {busy && progress && ` · searching collection ${progress.d} of ${progress.t}`}
            {busy && !progress && ' · searching…'}
          </p>

          {results.quran.length > 0 && (
            <Group title="Quran" count={results.quran.length}>
              {results.quran.map(r => {
                const [sn, av] = r.key.split(':')
                return (
                  <Card key={r.key} as={Link} to={`/quran/${sn}?ayah=${av}`} className="tap block px-4 py-3 active:bg-bg">
                    <p className="text-[11px] text-brand font-medium">{r.surah?.en} {r.key}</p>
                    <p className="text-[13px] text-muted mt-1 leading-relaxed">{snippet(r.text, results.phrase)}</p>
                  </Card>
                )
              })}
            </Group>
          )}

          {results.hadith.length > 0 && (
            <Group title="Hadith" count={results.hadith.length}>
              {results.hadith.map(r => (
                <Card key={`${r.collection}-${r.n}`} as={Link} to={`/hadith/${r.collection}/${r.book}?n=${r.n}`} className="tap block px-4 py-3 active:bg-bg">
                  <p className="text-[11px] text-brand font-medium">{r.collectionName} · {r.n}</p>
                  <p className="text-[13px] text-muted mt-1 leading-relaxed">{snippet(r.text, results.phrase)}</p>
                </Card>
              ))}
            </Group>
          )}

          {results.dua.length > 0 && (
            <Group title="Dua" count={results.dua.length}>
              {results.dua.map(r => {
                const [slug] = r.key.split('/')
                return (
                  <Card key={r.key} as={Link} to={`/dua/${slug}`} className="tap block px-4 py-3 active:bg-bg">
                    <p className="text-[11px] text-brand font-medium">{duaTitles[slug] || slug}</p>
                    <p className="text-sm mt-0.5">{r.title}</p>
                    <p className="text-[13px] text-muted mt-1 leading-relaxed">{snippet(r.text, results.phrase)}</p>
                  </Card>
                )
              })}
            </Group>
          )}
        </div>
      )}

      {results && results.hadith.length === 0 && !busy && (tab === 'all' || tab === 'hadith') && (
        <p className="text-[11px] text-muted/70 px-6 mt-4 text-center leading-relaxed">
          Hadith search reads a few megabytes per collection the first time. If a collection has
          never been opened, save it for offline from its page to include it here.
        </p>
      )}
    </Screen>
  )
}

function Group({ title, count, children }) {
  return (
    <section className="mb-5">
      <h2 className="px-4 text-xs font-semibold uppercase tracking-wider text-muted mb-2">
        {title} <span className="opacity-60 tabular-nums">({count})</span>
      </h2>
      <div className="px-4 space-y-2">{children}</div>
    </section>
  )
}
