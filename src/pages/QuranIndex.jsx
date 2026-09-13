import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { quranMeta } from '../lib/data.js'
import { store } from '../lib/store.js'
import { toArabicNumber } from '../lib/format.js'
import { Screen, Header, Loading, IconButton, Card } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'

const JUZ = Array.from({ length: 30 }, (_, i) => i + 1)

export default function QuranIndex() {
  const [meta, setMeta] = useState(null)
  const [q, setQ] = useState('')
  const [tab, setTab] = useState('surah')
  const [last, setLast] = useState(null)

  useEffect(() => { quranMeta().then(setMeta) }, [])
  useEffect(() => { store.lastRead().then(setLast) }, [])

  const surahs = useMemo(() => {
    if (!meta) return []
    const needle = q.trim().toLowerCase()
    if (!needle) return meta.surahs
    return meta.surahs.filter(s =>
      s.en.toLowerCase().includes(needle) ||
      s.meaning.toLowerCase().includes(needle) ||
      s.name.includes(q.trim()) ||
      String(s.n) === needle
    )
  }, [meta, q])

  if (!meta) return <Loading label="Loading the Quran" />

  return (
    <Screen>
      <Header
        title="Quran"
        subtitle="114 surahs · 6,236 ayahs"
        large
        actions={<IconButton name="search" label="Search the Quran" to="/search" />}
      />

      <div className="px-4 pt-3">
        <input
          value={q} onChange={e => setQ(e.target.value)}
          placeholder="Find a surah"
          className="w-full px-4 py-2.5 rounded-xl bg-surf border border-line text-sm outline-none focus:border-brand"
        />
      </div>

      {last && !q && (
        <div className="px-4 mt-3">
          <Card as={Link} to={`/quran/${last.surah}?ayah=${last.ayah}`} className="px-4 py-3 flex items-center gap-3 tap block">
            <Icon name="bookmark" size={16} className="text-brand shrink-0" />
            <span className="text-sm flex-1 min-w-0 truncate">
              Continue — {meta.surahs.find(s => s.n === last.surah)?.en}, ayah {last.ayah}
            </span>
            <Icon name="forward" size={16} className="text-muted" />
          </Card>
        </div>
      )}

      <div className="flex gap-2 px-4 mt-4">
        {[['surah', 'Surah'], ['juz', 'Juz']].map(([id, label]) => (
          <button
            key={id} onClick={() => setTab(id)}
            className={`tap px-4 py-1.5 rounded-full text-sm border transition-colors ${
              tab === id ? 'border-brand bg-brand/10 text-brand' : 'border-line text-muted'
            }`}
          >{label}</button>
        ))}
      </div>

      {tab === 'surah' ? (
        <ul className="mt-3 divide-y divide-line">
          {surahs.map(s => (
            <li key={s.n}>
              <Link to={`/quran/${s.n}`} className="tap flex items-center gap-3 px-4 py-3 active:bg-surf">
                <span className="w-9 h-9 shrink-0 grid place-items-center text-[11px] text-gold border border-gold/30 rotate-45 rounded-md">
                  <span className="-rotate-45 tabular-nums">{s.n}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-[15px] truncate">{s.en}</span>
                  <span className="block text-xs text-muted mt-0.5 truncate">
                    {s.meaning} · {s.type} · {s.ayahs} ayahs
                  </span>
                </span>
                <span className="ar ar-sm shrink-0" style={{ fontSize: 19, lineHeight: 1.6 }}>{s.name}</span>
              </Link>
            </li>
          ))}
          {surahs.length === 0 && <li className="px-4 py-10 text-center text-sm text-muted">No surah matches “{q}”.</li>}
        </ul>
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {JUZ.map(j => {
            const start = meta.juzStart[j - 1]
            const [sn, av] = start.split(':').map(Number)
            const s = meta.surahs.find(x => x.n === sn)
            return (
              <li key={j}>
                <Link to={`/quran/${sn}?ayah=${av}`} className="tap flex items-center gap-3 px-4 py-3 active:bg-surf">
                  <span className="w-9 h-9 shrink-0 grid place-items-center rounded-xl bg-surf border border-line text-xs tabular-nums text-brand">
                    {j}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-[15px]">Juz {j}</span>
                    <span className="block text-xs text-muted mt-0.5">Begins at {s?.en} {av}</span>
                  </span>
                  <span className="ar shrink-0 text-muted" style={{ fontSize: 16 }}>{toArabicNumber(j)}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </Screen>
  )
}
