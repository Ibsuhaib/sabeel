import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom'
import { surah as loadSurah, quranMeta } from '../lib/data.js'
import { useData } from '../lib/useData.js'
import { store } from '../lib/store.js'
import { useSettings } from '../lib/settings.jsx'
import { player } from '../lib/audio.js'
import { usePlayer, loadReciters, findReciter } from '../lib/reciters.js'
import { toArabicNumber } from '../lib/format.js'
import { Loading, LoadError, Sheet, Toggle, Choice, IconButton, Button } from '../components/ui.jsx'
import { ReciterList } from '../components/Player.jsx'
import DownloadAudio from '../components/DownloadAudio.jsx'
import SwipePager from '../components/SwipePager.jsx'
import SurahInfo from '../components/SurahInfo.jsx'
import { useReadingTimer } from '../lib/useReadingTimer.js'
import Icon from '../components/Icon.jsx'

const BISMILLAH = 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ'

export default function SurahReader() {
  const { n } = useParams()
  const num = Number(n)
  const [params] = useSearchParams()
  const nav = useNavigate()
  const { settings, set } = useSettings()

  const { data, error, retry } = useData(
    () => Promise.all([loadSurah(num), quranMeta()]).then(([s, meta]) => ({ s, meta })),
    [num],
    { label: 'this surah' }
  )

  const [bookmarks, setBookmarks] = useState([])
  const [notes, setNotes] = useState({})
  const [sheet, setSheet] = useState(null)
  const [selected, setSelected] = useState(null)
  const [catalogue, setCatalogue] = useState(null)

  // The ayah currently at the top of the screen. Recitation starts from here,
  // not from the beginning of the surah — if you are reading ayah 40, pressing
  // play should not drag you back to ayah 1.
  const [readingAt, setReadingAt] = useState(1)

  const audio = usePlayer()
  const containerRef = useRef(null)

  // Time on this screen counts towards the reading streak.
  useReadingTimer(true)
  const jumped = useRef(false)

  useEffect(() => { loadReciters().then(setCatalogue) }, [])
  useEffect(() => { store.bookmarksQuran().then(setBookmarks); store.notes().then(setNotes) }, [])
  useEffect(() => { jumped.current = false; setReadingAt(Number(params.get('ayah')) || 1) }, [num])

  useEffect(() => { if (data) player.setSurahLength(data.s.ayahs.length) }, [data])

  const info = useMemo(() => data?.meta.surahs.find(s => s.n === num), [data, num])
  const bookmarked = useMemo(() => new Set(bookmarks.map(b => b.id)), [bookmarks])

  useEffect(() => {
    const target = Number(params.get('ayah'))
    if (!data || !target || jumped.current) return
    jumped.current = true
    requestAnimationFrame(() => {
      document.getElementById(`ayah-${target}`)?.scrollIntoView({ block: 'center' })
    })
  }, [data, params])

  useEffect(() => {
    if (!audio.playing || !audio.ayah || audio.surah !== num) return
    document.getElementById(`ayah-${audio.ayah}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [audio.ayah, audio.playing, audio.surah, num])

  // One scroll handler feeds both the resume position and the play-from point.
  useEffect(() => {
    if (!data) return
    const record = () => {
      const rows = containerRef.current?.querySelectorAll('[data-ayah]')
      if (!rows?.length) return
      for (const r of rows) {
        if (r.getBoundingClientRect().bottom > 120) {
          const v = Number(r.dataset.ayah)
          setReadingAt(v)
          store.setLastRead({ surah: num, ayah: v, page: data.s.ayahs.find(a => a.v === v)?.p })
          break
        }
      }
    }
    const onScroll = debounce(record, 300)
    const t = setTimeout(record, 600)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { clearTimeout(t); window.removeEventListener('scroll', onScroll) }
  }, [data, num])

  const toggleBookmark = useCallback(async (a) => {
    setBookmarks(await store.toggleQuranBookmark(num, a.v, (a.en || '').slice(0, 120)))
  }, [num])

  if (error) return <LoadError message={error} onRetry={retry} />
  if (!data || !info) return <Loading label="Opening the muṣḥaf" />

  const ayahs = data.s.ayahs
  const meta = data.meta
  const showBismillah = num !== 1 && num !== 9
  const trKey = settings.translation === 'e2' ? 'e2' : 'en'
  const currentPage = ayahs.find(a => a.v === readingAt)?.p || info.page

  return (
    <div ref={containerRef} className="min-h-full pb-32">
      <header className="sticky top-0 z-30 safe-t bg-bg/92 backdrop-blur-md border-b border-line">
        <div className="flex items-center gap-1 px-2 h-14">
          <IconButton name="back" label="Back to surah list" onClick={() => nav('/quran')} size={22} />
          <button onClick={() => setSheet('index')} className="tap min-w-0 flex-1 text-center px-2">
            <span className="block text-[15px] font-semibold truncate">{info.en}</span>
            <span className="block text-[11px] text-muted">{info.meaning} · {info.ayahs} ayahs</span>
          </button>
          <IconButton
            name="book" label="Muṣḥaf page view"
            onClick={() => { set({ readerMode: 'mushaf' }); nav(`/mushaf/${currentPage}`) }}
          />
          <DownloadAudio
            reciter={catalogue ? findReciter(catalogue, settings.reciter) : null}
            surah={num} ayahCount={ayahs.length} surahName={info.en}
          />
          <IconButton
            name="play"
            label={`Play from ayah ${readingAt}`}
            onClick={() => player.play(num, readingAt, ayahs.length)}
          />
          <IconButton name="settings" label="Reading settings" onClick={() => setSheet('settings')} />
        </div>
      </header>

      <div className="px-4 pt-8 pb-4 text-center">
        <div className="ar text-brand" style={{ textAlign: 'center', fontSize: 26 }}>{info.name}</div>
        <div className="text-[11px] uppercase tracking-widest text-muted mt-2">
          {info.type} · Surah {info.n} · Juz {info.juz} · Page {info.page}
        </div>
        {showBismillah && (
          <div className="ar mt-6 mb-2 text-ink/90" style={{ textAlign: 'center', fontSize: 'calc(var(--ar-size) * 0.9)' }}>
            {BISMILLAH}
          </div>
        )}
      </div>

      <SwipePager
        pageKey={num}
        canPrev={num > 1}
        canNext={num < 114}
        onPrev={() => nav(`/quran/${num - 1}`)}
        onNext={() => nav(`/quran/${num + 1}`)}
      >
      <div className="divide-y divide-line/60">
        {ayahs.map(a => {
          const id = `${num}:${a.v}`
          const isPlaying = audio.playing && audio.surah === num && audio.ayah === a.v
          const inRange = audio.range && audio.surah === num && a.v >= audio.range.from && a.v <= audio.range.to
          const isOpen = selected === a.v
          return (
            <article
              key={a.v} id={`ayah-${a.v}`} data-ayah={a.v}
              className={`px-4 py-5 scroll-mt-20 transition-colors ${
                isPlaying ? 'bg-brand/[0.07]' : isOpen ? 'bg-surf/60' : inRange ? 'bg-gold/[0.05]' : ''
              }`}
            >
              <button
                onClick={() => setSelected(isOpen ? null : a.v)}
                className="tap w-full text-right block"
                aria-label={`Ayah ${a.v} actions`}
              >
                <p className="ar">
                  {a.ar}
                  <span className="ayah-mark">{toArabicNumber(a.v)}</span>
                  {a.sajdah && <span className="text-gold" style={{ fontSize: '0.5em' }} title="Place of prostration"> ۩</span>}
                </p>
              </button>

              {settings.showTransliteration && a.tr && (
                <p className="text-[13px] text-muted italic mt-3 leading-relaxed">{a.tr}</p>
              )}

              {settings.showTranslation && (
                <p className="translation mt-3 text-ink/85">
                  <span className="text-muted text-xs tabular-nums mr-2">{num}:{a.v}</span>
                  {a[trKey] || a.en}
                </p>
              )}

              {notes[id] && (
                <p className="mt-3 text-xs bg-surf border border-line rounded-xl px-3 py-2 text-muted">
                  <Icon name="note" size={12} className="inline mr-1.5 -mt-0.5" />{notes[id].text}
                </p>
              )}

              {isOpen && (
                <AyahActions
                  surah={num} ayah={a} info={info}
                  ayahCount={ayahs.length}
                  bookmarked={bookmarked.has(id)}
                  note={notes[id]?.text || ''}
                  playing={isPlaying}
                  onBookmark={() => toggleBookmark(a)}
                  onNote={async text => setNotes(await store.setNote(id, text))}
                  translation={a[trKey] || a.en}
                />
              )}
            </article>
          )
        })}
      </div>

      </SwipePager>

      <nav className="flex items-center justify-between gap-3 px-4 py-8">
        {num > 1
          ? <Button to={`/quran/${num - 1}`} variant="soft" size="sm"><Icon name="back" size={14} />{meta.surahs[num - 2].en}</Button>
          : <span />}
        {num < 114
          ? <Button to={`/quran/${num + 1}`} variant="soft" size="sm">{meta.surahs[num].en}<Icon name="forward" size={14} /></Button>
          : <span />}
      </nav>

      <ReadingSettings
        open={sheet === 'settings'} onClose={() => setSheet(null)}
        settings={settings} set={set}
        onOpenReciters={() => setSheet('reciter')}
        onMushaf={() => { set({ readerMode: 'mushaf' }); nav(`/mushaf/${currentPage}`) }}
      />
      <Sheet open={sheet === 'reciter'} onClose={() => setSheet(null)} title="Reciter">
        <ReciterList
          catalogue={catalogue} currentId={settings.reciter}
          onSelect={id => { set({ reciter: id }); setSheet(null) }}
        />
      </Sheet>
      <SurahJump
        open={sheet === 'index'} onClose={() => setSheet(null)}
        meta={meta} current={num} info={info} ayahs={ayahs}
      />
    </div>
  )
}

function AyahActions({ surah, ayah, info, ayahCount, bookmarked, note, playing, onBookmark, onNote, translation }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(note)
  const [copied, setCopied] = useState(false)

  const shareText = `${ayah.ar}\n\n"${translation}"\n\n— Quran ${info.en} ${surah}:${ayah.v}`

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch { /* clipboard blocked */ }
  }

  async function share() {
    if (navigator.share) { try { await navigator.share({ text: shareText }) } catch { /* cancelled */ } }
    else copy()
  }

  return (
    <div className="mt-4 pt-3 border-t border-line/60">
      <div className="flex items-center gap-1">
        <ActionBtn
          icon={playing ? 'pause' : 'play'} label={playing ? 'Pause' : 'Play'} active={playing}
          onClick={() => player.toggle(surah, ayah.v, ayahCount)}
        />
        <ActionBtn
          icon="reset" label="Loop from here"
          onClick={() => player.setRange(ayah.v, Math.min(ayah.v + 4, ayahCount))}
        />
        <ActionBtn icon="bookmark" label={bookmarked ? 'Saved' : 'Save'} onClick={onBookmark} active={bookmarked} />
        <ActionBtn icon="note" label="Note" onClick={() => { setDraft(note); setEditing(v => !v) }} active={!!note} />
        <ActionBtn icon="copy" label={copied ? 'Copied' : 'Copy'} onClick={copy} />
        <ActionBtn icon="share" label="Share" onClick={share} />
      </div>

      {editing && (
        <div className="mt-3">
          <textarea
            value={draft} onChange={e => setDraft(e.target.value)} rows={3}
            placeholder="A private reflection on this ayah. Stored on this device only."
            className="w-full px-3 py-2 rounded-xl bg-bg border border-line text-sm outline-none focus:border-brand resize-none"
          />
          <div className="flex gap-2 mt-2">
            <Button size="sm" onClick={() => { onNote(draft); setEditing(false) }}>Save note</Button>
            {note && <Button size="sm" variant="ghost" onClick={() => { onNote(''); setEditing(false) }}>Delete</Button>}
          </div>
        </div>
      )}
    </div>
  )
}

function ActionBtn({ icon, label, onClick, active }) {
  return (
    <button
      onClick={onClick}
      className={`tap flex-1 flex flex-col items-center gap-1 py-2 rounded-xl text-[9px] transition-colors ${
        active ? 'text-brand bg-brand/10' : 'text-muted hover:text-ink'
      }`}
    >
      <Icon name={icon} size={17} fill={active && icon === 'bookmark' ? 'currentColor' : 'none'} />
      {label}
    </button>
  )
}

function ReadingSettings({ open, onClose, settings, set, onOpenReciters, onMushaf }) {
  return (
    <Sheet open={open} onClose={onClose} title="Reading settings">
      <div className="py-2">
        <div className="px-4 pt-2 pb-1 text-xs font-semibold uppercase tracking-wider text-muted">View</div>
        <Choice
          columns={2}
          value={settings.readerMode}
          onChange={v => { set({ readerMode: v }); if (v === 'mushaf') { onClose(); onMushaf() } }}
          options={[
            { id: 'scroll', label: 'Scrolling', note: 'Ayah by ayah with translation' },
            { id: 'mushaf', label: 'Muṣḥaf pages', note: '604-page Madani layout' }
          ]}
        />

        <Field label="Arabic size">
          <Slider min={20} max={54} value={settings.arabicSize} onChange={v => set({ arabicSize: v })} suffix="px" />
        </Field>
        <Field label="Line spacing">
          <Slider min={1.6} max={3.4} step={0.1} value={settings.arabicLeading} onChange={v => set({ arabicLeading: v })} />
        </Field>
        <Field label="Translation size">
          <Slider min={12} max={22} value={settings.translationSize} onChange={v => set({ translationSize: v })} suffix="px" />
        </Field>

        <div className="px-4 pt-2 pb-1 text-xs font-semibold uppercase tracking-wider text-muted">Arabic font</div>
        <Choice
          columns={1}
          value={settings.arabicFont}
          onChange={v => set({ arabicFont: v })}
          options={[
            { id: 'Amiri Quran', label: 'Amiri Quran', note: 'Classical naskh, designed for the muṣḥaf' },
            { id: 'Scheherazade New', label: 'Scheherazade New', note: 'Larger counters, easier at small sizes' },
            { id: 'Noto Naskh Arabic', label: 'Noto Naskh Arabic', note: 'Highest legibility on low-end screens' }
          ]}
        />

        <div className="px-4 pt-5 pb-1 text-xs font-semibold uppercase tracking-wider text-muted">Translation</div>
        <Choice
          columns={1}
          value={settings.translation}
          onChange={v => set({ translation: v })}
          options={[
            { id: 'en', label: 'Saheeh International' },
            { id: 'e2', label: 'The Clear Quran — Mustafa Khattab' }
          ]}
        />

        <div className="px-4 pt-5 pb-2">
          <Button variant="soft" size="lg" onClick={onOpenReciters}>
            <Icon name="play" size={15} />Choose a reciter
          </Button>
        </div>

        <div className="mt-2 border-t border-line">
          <Toggle checked={settings.showTranslation} onChange={v => set({ showTranslation: v })} label="Show translation" />
          <Toggle checked={settings.showTransliteration} onChange={v => set({ showTransliteration: v })} label="Show transliteration" hint="Latin script under each ayah" />
          <Toggle checked={settings.dyslexicFont} onChange={v => set({ dyslexicFont: v })} label="Dyslexia-friendly translation font" />
        </div>
      </div>
    </Sheet>
  )
}

function SurahJump({ open, onClose, meta, current, info, ayahs }) {
  const [tab, setTab] = useState('info')
  useEffect(() => { if (open) setTab('info') }, [open])

  return (
    <Sheet open={open} onClose={onClose} title={info?.en || 'Surah'}>
      <div className="flex gap-2 px-4 py-3 border-b border-line">
        {[['info', 'Surah info'], ['list', 'All surahs']].map(([id, label]) => (
          <button
            key={id} onClick={() => setTab(id)}
            className={`tap chip px-3.5 py-1.5 rounded-full text-xs border transition-colors ${
              tab === id ? 'border-brand bg-brand/10 text-brand' : 'border-line text-muted'
            }`}
          >{label}</button>
        ))}
      </div>

      {tab === 'info' && (
        <div className="py-4">
          <SurahInfo surah={info} ayahs={ayahs} meta={meta} />
        </div>
      )}

      {tab === 'list' && (
      <ul className="divide-y divide-line">
        {meta.surahs.map(s => (
          <li key={s.n}>
            <Link
              to={`/quran/${s.n}`} onClick={onClose}
              className={`tap flex items-center gap-3 px-4 py-2.5 ${s.n === current ? 'bg-brand/10 text-brand' : ''}`}
            >
              <span className="w-7 text-xs tabular-nums text-muted">{s.n}</span>
              <span className="flex-1 text-sm truncate">{s.en}</span>
              <span className="ar text-base" style={{ lineHeight: 1.5 }}>{s.name}</span>
            </Link>
          </li>
        ))}
      </ul>
      )}
    </Sheet>
  )
}

function Field({ label, children }) {
  return (
    <div className="px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">{label}</div>
      {children}
    </div>
  )
}

function Slider({ min, max, step = 1, value, onChange, suffix = '' }) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="flex-1 accent-[rgb(var(--c-brand))]"
      />
      <span className="w-14 text-right text-sm tabular-nums text-muted">{value}{suffix}</span>
    </div>
  )
}

function debounce(fn, ms) {
  let t
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms) }
}
