import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { quranMeta } from '../lib/data.js'
import { useData } from '../lib/useData.js'
import { store } from '../lib/store.js'
import { toArabicNumber, relativeDay } from '../lib/format.js'
import { Screen, Header, Loading, LoadError, IconButton, Card } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'

const MODES = [
  { id: 'surah', label: 'Surah' },
  { id: 'page', label: 'Page' },
  { id: 'juz', label: 'Juz' },
  { id: 'hizb', label: 'Hizb' },
  { id: 'ruku', label: 'Ruku' }
]

const QUICK_LINKS = [
  { n: 36, label: 'Yaseen' },
  { n: 67, label: 'Al-Mulk' },
  { n: 18, label: 'Al-Kahf' },
  { n: 55, label: 'Ar-Rahman' },
  { n: 56, label: "Al-Waqi'ah" },
  { n: 2, label: 'Ayatul Kursi', ayah: 255 }
]

export default function QuranIndex() {
  const { data: meta, error, retry } = useData(quranMeta, [], { label: 'the surah list' })
  const [q, setQ] = useState('')
  const [mode, setMode] = useState('surah')
  const [recents, setRecents] = useState([])

  useEffect(() => { store.recents().then(setRecents) }, [])

  const needle = q.trim().toLowerCase()

  const surahs = useMemo(() => {
    if (!meta) return []
    if (!needle) return meta.surahs
    return meta.surahs.filter(s =>
      s.en.toLowerCase().includes(needle) ||
      s.meaning.toLowerCase().includes(needle) ||
      s.name.includes(q.trim()) ||
      String(s.n) === needle
    )
  }, [meta, needle, q])

  if (error) return <LoadError message={error} onRetry={retry} back={false} />
  if (!meta) return <Loading label="Loading the Quran" />

  const nameOf = n => meta.surahs.find(s => s.n === n)?.en || `Surah ${n}`
  const surahAt = key => Number(String(key).split(':')[0])
  const ayahAt = key => Number(String(key).split(':')[1])

  return (
    <Screen>
      <Header
        title="Quran"
        subtitle="114 surahs · 6,236 ayahs"
        large
        actions={<>
          <IconButton name="book" label="Muṣḥaf page view" to={`/mushaf/${recents[0]?.page || 1}`} />
          <IconButton name="search" label="Search the Quran" to="/search" />
        </>}
      />

      <div className="px-4 pt-3">
        <div className="relative">
          <Icon name="search" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={q} onChange={e => setQ(e.target.value)}
            placeholder="Find a surah"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surf border border-line text-sm outline-none focus:border-brand"
          />
        </div>
      </div>

      {!needle && recents.length > 0 && (
        <Section label="Last read">
          <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 pb-1">
            {recents.map(r => (
              <Link
                key={r.id} to={`/quran/${r.surah}?ayah=${r.ayah}`}
                className="tap chip shrink-0 gap-2 px-3.5 rounded-full border border-line bg-surf active:border-brand/50"
              >
                <span className="text-sm text-brand font-medium">{nameOf(r.surah)}</span>
                <span className="text-[11px] text-muted tabular-nums">{r.surah}:{r.ayah}</span>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {!needle && (
        <Section label="Quick links">
          <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 pb-1">
            {QUICK_LINKS.map(l => (
              <Link
                key={l.label}
                to={`/quran/${l.n}${l.ayah ? `?ayah=${l.ayah}` : ''}`}
                className="tap chip shrink-0 px-4 rounded-full border border-line bg-surf text-sm active:border-brand/50"
              >{l.label}</Link>
            ))}
          </div>
        </Section>
      )}

      {!needle && (
        <div className="sticky top-14 z-20 bg-bg/95 backdrop-blur-md border-b border-line mt-3">
          <div className="flex gap-1.5 px-4 py-2 overflow-x-auto no-scrollbar">
            {MODES.map(m => (
              <button
                key={m.id} onClick={() => setMode(m.id)}
                className={`tap chip shrink-0 px-4 rounded-full text-sm transition-colors ${
                  mode === m.id ? 'bg-brand text-bg font-medium' : 'text-muted border border-line'
                }`}
              >{m.label}</button>
            ))}
          </div>
        </div>
      )}

      {(needle || mode === 'surah') && (
        <ul className="mt-1 divide-y divide-line">
          {surahs.map(s => (
            <li key={s.n} className="cv-row">
              <Link to={`/quran/${s.n}`} className="tap flex items-center gap-3 px-4 py-3 active:bg-surf min-h-[64px]">
                <span className="w-9 h-9 shrink-0 grid place-items-center text-[11px] text-gold border border-gold/30 rotate-45 rounded-md">
                  <span className="-rotate-45 tabular-nums">{s.n}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-[15px] truncate">{s.en}</span>
                  <span className="block text-xs text-muted mt-0.5 truncate">
                    {s.meaning} · {s.type} · {s.ayahs} ayahs · p.{s.page}
                  </span>
                </span>
                <span className="ar ar-sm shrink-0" style={{ fontSize: 19, lineHeight: 1.6 }}>{s.name}</span>
              </Link>
            </li>
          ))}
          {surahs.length === 0 && <li className="px-4 py-10 text-center text-sm text-muted">No surah matches “{q}”.</li>}
        </ul>
      )}

      {!needle && mode === 'page' && (
        <ul className="mt-1 divide-y divide-line">
          {meta.pages.map(p => (
            <li key={p.p} className="cv-row">
              <Link to={`/mushaf/${p.p}`} className="tap flex items-center gap-3 px-4 py-3 active:bg-surf min-h-[60px]">
                <Badge>{p.p}</Badge>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] truncate">{nameOf(p.from.s)}</span>
                  <span className="block text-xs text-muted mt-0.5 tabular-nums">
                    {p.from.s}:{p.from.a} – {p.to.s}:{p.to.a} · Juz {p.juz}
                  </span>
                </span>
                <Icon name="forward" size={16} className="text-muted shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {!needle && mode === 'juz' && (
        <ul className="mt-1 divide-y divide-line">
          {meta.juzStart.map((key, i) => (
            <li key={i} className="cv-row">
              <Link to={`/quran/${surahAt(key)}?ayah=${ayahAt(key)}`} className="tap flex items-center gap-3 px-4 py-3 active:bg-surf min-h-[60px]">
                <Badge>{i + 1}</Badge>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px]">Juz {i + 1}</span>
                  <span className="block text-xs text-muted mt-0.5">Begins at {nameOf(surahAt(key))} {ayahAt(key)}</span>
                </span>
                <span className="ar shrink-0 text-muted" style={{ fontSize: 16 }}>{toArabicNumber(i + 1)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {!needle && mode === 'hizb' && (
        <ul className="mt-1 divide-y divide-line">
          {/* 240 quarters group into 60 hizb; the quarters are shown as ¼ marks
              under each one, which is how a muṣḥaf actually marks them. */}
          {Array.from({ length: 60 }, (_, i) => {
            const quarterIndex = i * 4
            const key = meta.hizbStart[quarterIndex]
            if (!key) return null
            return (
              <li key={i} className="cv-row">
                <Link to={`/quran/${surahAt(key)}?ayah=${ayahAt(key)}`} className="tap flex items-center gap-3 px-4 py-3 active:bg-surf min-h-[60px]">
                  <Badge>{i + 1}</Badge>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px]">Hizb {i + 1}</span>
                    <span className="block text-xs text-muted mt-0.5">
                      Juz {Math.floor(i / 2) + 1} · begins at {nameOf(surahAt(key))} {ayahAt(key)}
                    </span>
                  </span>
                  <Icon name="forward" size={16} className="text-muted shrink-0" />
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      {!needle && mode === 'ruku' && (
        <ul className="mt-1 divide-y divide-line">
          {meta.rukuStart.map((key, i) => (
            <li key={i} className="cv-row">
              <Link to={`/quran/${surahAt(key)}?ayah=${ayahAt(key)}`} className="tap flex items-center gap-3 px-4 py-3 active:bg-surf min-h-[60px]">
                <Badge>{i + 1}</Badge>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] truncate">{nameOf(surahAt(key))}</span>
                  <span className="block text-xs text-muted mt-0.5 tabular-nums">Ruku {i + 1} · from ayah {ayahAt(key)}</span>
                </span>
                <Icon name="forward" size={16} className="text-muted shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Screen>
  )
}

function Section({ label, children }) {
  return (
    <section className="mt-3">
      <h2 className="px-4 mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">{label}</h2>
      {children}
    </section>
  )
}

function Badge({ children }) {
  return (
    <span className="w-9 h-9 shrink-0 grid place-items-center rounded-xl bg-surf border border-line text-xs tabular-nums text-brand">
      {children}
    </span>
  )
}
