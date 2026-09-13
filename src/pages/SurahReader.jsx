import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom'
import { surah as loadSurah, quranMeta } from '../lib/data.js'
import { store } from '../lib/store.js'
import { useSettings } from '../lib/settings.jsx'
import { createPlayer, RECITERS, SPEEDS } from '../lib/audio.js'
import { toArabicNumber } from '../lib/format.js'
import { Loading, Sheet, Toggle, Choice, IconButton, Button } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'

const BISMILLAH = 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ'

export default function SurahReader() {
  const { n } = useParams()
  const num = Number(n)
  const [params, setParams] = useSearchParams()
  const nav = useNavigate()
  const { settings, set } = useSettings()

  const [data, setData] = useState(null)
  const [meta, setMeta] = useState(null)
  const [bookmarks, setBookmarks] = useState([])
  const [notes, setNotes] = useState({})
  const [sheet, setSheet] = useState(null)       // 'settings' | 'audio' | null
  const [selected, setSelected] = useState(null) // ayah number with the action bar open
  const [audio, setAudio] = useState({ playing: false, ayah: null })

  const playerRef = useRef(null)
  const containerRef = useRef(null)
  const jumped = useRef(false)

  useEffect(() => { quranMeta().then(setMeta) }, [])
  useEffect(() => {
    setData(null)
    jumped.current = false
    loadSurah(num).then(setData)
  }, [num])
  useEffect(() => { store.bookmarksQuran().then(setBookmarks); store.notes().then(setNotes) }, [])

  // One player for the lifetime of the screen.
  useEffect(() => {
    const p = createPlayer()
    playerRef.current = p
    const off = p.subscribe(s => setAudio(s))
    return () => { p.stop(); off() }
  }, [])

  useEffect(() => {
    playerRef.current?.configure({ reciter: settings.reciter, lastAyah: data?.ayahs.length })
  }, [settings.reciter, data])

  const info = useMemo(() => meta?.surahs.find(s => s.n === num), [meta, num])
  const bookmarked = useMemo(() => new Set(bookmarks.map(b => b.id)), [bookmarks])

  // Jump to ?ayah= once the text is on screen.
  useEffect(() => {
    const target = Number(params.get('ayah'))
    if (!data || !target || jumped.current) return
    jumped.current = true
    requestAnimationFrame(() => {
      document.getElementById(`ayah-${target}`)?.scrollIntoView({ block: 'center' })
    })
  }, [data, params])

  // Keep the playing ayah in view.
  useEffect(() => {
    if (!audio.playing || !audio.ayah) return
    document.getElementById(`ayah-${audio.ayah}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [audio.ayah, audio.playing])

  // Remember where the reader stopped.
  useEffect(() => {
    if (!data) return
    const onScroll = () => {
      const rows = containerRef.current?.querySelectorAll('[data-ayah]')
      if (!rows?.length) return
      for (const r of rows) {
        const box = r.getBoundingClientRect()
        if (box.bottom > 120) {
          store.setLastRead({ surah: num, ayah: Number(r.dataset.ayah) })
          break
        }
      }
    }
    const t = setTimeout(onScroll, 800)
    window.addEventListener('scroll', debounce(onScroll, 700), { passive: true })
    return () => { clearTimeout(t); window.removeEventListener('scroll', onScroll) }
  }, [data, num])

  const toggleBookmark = useCallback(async (a) => {
    const list = await store.toggleQuranBookmark(num, a.v, (a.en || '').slice(0, 120))
    setBookmarks(list)
  }, [num])

  if (!data || !info) return <Loading label="Opening the muṣḥaf" />

  const showBismillah = num !== 1 && num !== 9
  const trKey = settings.translation === 'e2' ? 'e2' : 'en'

  return (
    <div ref={containerRef} className="min-h-full pb-32">
      <header className="sticky top-0 z-30 safe-t bg-bg/92 backdrop-blur-md border-b border-line">
        <div className="flex items-center gap-1 px-2 h-14">
          <IconButton name="back" label="Back to surah list" onClick={() => nav('/quran')} size={22} />
          <button onClick={() => setSheet('index')} className="tap min-w-0 flex-1 text-center px-2">
            <span className="block text-[15px] font-semibold truncate">{info.en}</span>
            <span className="block text-[11px] text-muted">{info.meaning} · {info.ayahs} ayahs</span>
          </button>
          <IconButton name="play" label="Play surah" onClick={() => setSheet('audio')} />
          <IconButton name="settings" label="Reading settings" onClick={() => setSheet('settings')} />
        </div>
      </header>

      <div className="px-4 pt-8 pb-4 text-center">
        <div className="ar text-brand" style={{ textAlign: 'center', fontSize: 26 }}>{info.name}</div>
        <div className="text-[11px] uppercase tracking-widest text-muted mt-2">
          {info.type} · Surah {info.n} · Juz {info.juz}
        </div>
        {showBismillah && (
          <div className="ar mt-6 mb-2 text-ink/90" style={{ textAlign: 'center', fontSize: 'calc(var(--ar-size) * 0.9)' }}>
            {BISMILLAH}
          </div>
        )}
      </div>

      <div className="divide-y divide-line/60">
        {data.ayahs.map(a => {
          const id = `${num}:${a.v}`
          const isPlaying = audio.playing && audio.ayah === a.v
          const isOpen = selected === a.v
          return (
            <article
              key={a.v} id={`ayah-${a.v}`} data-ayah={a.v}
              className={`px-4 py-5 scroll-mt-20 transition-colors ${isPlaying ? 'bg-brand/[0.07]' : isOpen ? 'bg-surf/60' : ''}`}
            >
              <button
                onClick={() => setSelected(isOpen ? null : a.v)}
                className="tap w-full text-right block"
                aria-label={`Ayah ${a.v} actions`}
              >
                <p className="ar">
                  {a.ar}
                  <span className="ayah-mark">{toArabicNumber(a.v)}</span>
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
                  bookmarked={bookmarked.has(id)}
                  note={notes[id]?.text || ''}
                  playing={isPlaying}
                  onPlay={() => playerRef.current?.toggle(num, a.v)}
                  onBookmark={() => toggleBookmark(a)}
                  onNote={async text => setNotes(await store.setNote(id, text))}
                  translation={a[trKey] || a.en}
                />
              )}
            </article>
          )
        })}
      </div>

      <nav className="flex items-center justify-between gap-3 px-4 py-8">
        {num > 1
          ? <Button to={`/quran/${num - 1}`} variant="soft" size="sm"><Icon name="back" size={14} />{meta.surahs[num - 2].en}</Button>
          : <span />}
        {num < 114
          ? <Button to={`/quran/${num + 1}`} variant="soft" size="sm">{meta.surahs[num].en}<Icon name="forward" size={14} /></Button>
          : <span />}
      </nav>

      {audio.playing && <NowPlaying audio={audio} info={info} onPause={() => playerRef.current?.pause()} onStop={() => playerRef.current?.stop()} />}

      <ReadingSettings open={sheet === 'settings'} onClose={() => setSheet(null)} settings={settings} set={set} />
      <AudioSheet
        open={sheet === 'audio'} onClose={() => setSheet(null)}
        settings={settings} set={set} player={playerRef.current} surahLength={data.ayahs.length}
        onPlayAll={() => { playerRef.current?.configure({ range: null }); playerRef.current?.play(num, 1); setSheet(null) }}
      />
      <SurahJump open={sheet === 'index'} onClose={() => setSheet(null)} meta={meta} current={num} />
    </div>
  )
}

function AyahActions({ surah, ayah, info, bookmarked, note, playing, onPlay, onBookmark, onNote, translation }) {
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
        <ActionBtn icon={playing ? 'pause' : 'play'} label={playing ? 'Pause' : 'Play'} onClick={onPlay} active={playing} />
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
      className={`tap flex-1 flex flex-col items-center gap-1 py-2 rounded-xl text-[10px] transition-colors ${
        active ? 'text-brand bg-brand/10' : 'text-muted hover:text-ink'
      }`}
    >
      <Icon name={icon} size={17} fill={active && (icon === 'bookmark') ? 'currentColor' : 'none'} />
      {label}
    </button>
  )
}

function NowPlaying({ audio, info, onPause, onStop }) {
  return (
    <div className="fixed bottom-0 inset-x-0 z-40 safe-b bg-surf/97 backdrop-blur border-t border-line">
      <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 py-3">
        <span className="w-9 h-9 rounded-full bg-brand/15 text-brand grid place-items-center shrink-0 animate-pulse">
          <Icon name="play" size={15} fill="currentColor" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{info.en} · {audio.ayah}</p>
          <p className="text-[11px] text-muted truncate">
            {RECITERS.find(r => r.id === audio.reciter)?.name || 'Reciting'}
            {audio.repeatAyah > 1 && ` · repeat ${audio.played + 1}/${audio.repeatAyah}`}
          </p>
        </div>
        <IconButton name="pause" label="Pause" onClick={onPause} />
        <IconButton name="close" label="Stop" onClick={onStop} />
      </div>
    </div>
  )
}

function ReadingSettings({ open, onClose, settings, set }) {
  return (
    <Sheet open={open} onClose={onClose} title="Reading settings">
      <div className="py-2">
        <Field label="Arabic size">
          <Slider min={20} max={54} value={settings.arabicSize} onChange={v => set({ arabicSize: v })} suffix="px" />
        </Field>
        <Field label="Line spacing">
          <Slider min={1.6} max={3.2} step={0.1} value={settings.arabicLeading} onChange={v => set({ arabicLeading: v })} />
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

        <div className="mt-4 border-t border-line">
          <Toggle checked={settings.showTranslation} onChange={v => set({ showTranslation: v })} label="Show translation" />
          <Toggle checked={settings.showTransliteration} onChange={v => set({ showTransliteration: v })} label="Show transliteration" hint="Latin script under each ayah" />
          <Toggle checked={settings.dyslexicFont} onChange={v => set({ dyslexicFont: v })} label="Dyslexia-friendly translation font" />
        </div>
      </div>
    </Sheet>
  )
}

function AudioSheet({ open, onClose, settings, set, player, surahLength, onPlayAll }) {
  const [repeat, setRepeat] = useState(1)
  const [speed, setSpeed] = useState(1)

  useEffect(() => { player?.configure({ repeatAyah: repeat, speed }) }, [repeat, speed, player])

  return (
    <Sheet open={open} onClose={onClose} title="Recitation">
      <div className="py-2">
        <div className="px-4 pb-3">
          <Button size="lg" onClick={onPlayAll}>
            <Icon name="play" size={16} fill="currentColor" />Play the whole surah
          </Button>
          <p className="text-[11px] text-muted mt-2 text-center">
            {surahLength} ayahs · streams from EveryAyah, cached as you listen
          </p>
        </div>

        <div className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wider text-muted">Repeat each ayah</div>
        <Choice
          columns={4} value={repeat} onChange={setRepeat}
          options={[1, 2, 3, 5].map(v => ({ id: v, label: v === 1 ? 'Off' : `${v}×` }))}
        />

        <div className="px-4 pt-5 pb-1 text-xs font-semibold uppercase tracking-wider text-muted">Speed</div>
        <Choice
          columns={5} value={speed} onChange={setSpeed}
          options={SPEEDS.map(v => ({ id: v, label: `${v}×` }))}
        />

        <div className="px-4 pt-5 pb-1 text-xs font-semibold uppercase tracking-wider text-muted">Reciter</div>
        <div className="px-4 space-y-2 pb-4">
          {RECITERS.map(r => (
            <button
              key={r.id} onClick={() => set({ reciter: r.id })}
              className={`tap w-full text-left px-3 py-2.5 rounded-xl border text-sm ${
                settings.reciter === r.id ? 'border-brand bg-brand/10' : 'border-line bg-bg text-muted'
              }`}
            >
              <span className="block">{r.name}</span>
              <span className="block text-[11px] opacity-60">{r.style}</span>
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  )
}

function SurahJump({ open, onClose, meta, current }) {
  return (
    <Sheet open={open} onClose={onClose} title="Jump to surah">
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
