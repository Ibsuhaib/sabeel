import { useEffect, useState } from 'react'
import { player, SPEEDS, REPEATS, DELAYS } from '../lib/audio.js'
import { usePlayer, groupReciters, fmtClock, loadReciters } from '../lib/reciters.js'
import { quranMeta } from '../lib/data.js'
import { useSettings } from '../lib/settings.jsx'
import { Sheet, Choice, Toggle, Button } from './ui.jsx'
import Icon from './Icon.jsx'
import ReciterPreview, { stopPreview } from './ReciterPreview.jsx'

// The persistent transport. Mounted once at the app level, not per page, so
// recitation keeps playing and stays controllable while you look something up —
// stopping it to check a translation is the most irritating thing a Quran app
// can do. It derives everything it needs from the player's own state.
export default function Player() {
  const s = usePlayer()
  const { settings, set } = useSettings()
  const [expanded, setExpanded] = useState(false)
  const [catalogue, setCatalogue] = useState(null)
  const [meta, setMeta] = useState(null)

  useEffect(() => { loadReciters().then(setCatalogue) }, [])
  useEffect(() => { if (s.surah && !meta) quranMeta().then(setMeta) }, [s.surah, meta])

  const info = meta?.surahs.find(x => x.n === s.surah)
  const surahName = info?.en
  const ayahCount = info?.ayahs
  const onSelectReciter = id => set({ reciter: id })

  if (!s.reciter || !s.surah) return null

  const isSurahMode = s.reciter.mode === 'surah'
  const progress = s.duration ? (s.time / s.duration) * 100 : 0

  return (
    <>
      <div className="fixed bottom-0 inset-x-0 z-40 safe-b bg-surf/97 backdrop-blur border-t border-line">
        <div
          className="h-0.5 bg-line cursor-pointer"
          onClick={e => {
            const r = e.currentTarget.getBoundingClientRect()
            player.seek(((e.clientX - r.left) / r.width) * s.duration)
          }}
        >
          <div className="h-full bg-brand transition-[width] duration-150" style={{ width: `${progress}%` }} />
        </div>

        <div className="max-w-2xl mx-auto flex items-center gap-1 px-3 py-2">
          <button onClick={() => setExpanded(true)} className="tap min-w-0 flex-1 text-left pr-2">
            <span className="block text-[13px] font-medium truncate">
              {surahName || `Surah ${s.surah}`}
              {!isSurahMode && s.ayah === 0
                ? ' · Bismillah'
                : !isSurahMode && s.ayah ? ` · Ayah ${s.ayah}` : ''}
            </span>
            <span className="block text-[11px] text-muted truncate">
              {s.error
                ? <span className="text-amber-500">{s.error}</span>
                : s.buffering
                  ? <span className="text-gold">
                      Fetching the surah — {s.buffering.done} of {s.buffering.total} ayahs
                    </span>
                : s.waiting
                  ? <span className="text-gold">Pausing before the next ayah…</span>
                  : <>
                    {s.reciter.name}
                    {s.range && ` · looping ${s.range.from}–${s.range.to}`}
                    {s.repeat !== 1 && ` · repeat ${s.repeat === Infinity ? '∞' : `${s.played + 1}/${s.repeat}`}`}
                  </>}
            </span>
          </button>

          <span className="text-[10px] text-muted tabular-nums shrink-0 hidden xs:block">
            {fmtClock(s.time)}
          </span>

          <button
            onClick={() => player.previous()}
            className="tap p-2 rounded-full text-muted hover:text-ink active:bg-bg"
            aria-label={isSurahMode ? 'Back 30 seconds' : 'Previous ayah'}
          >
            <Icon name="back" size={19} />
          </button>

          <button
            onClick={() => player.playPause()}
            className="tap w-10 h-10 rounded-full bg-brand text-bg grid place-items-center shrink-0"
            aria-label={s.playing ? 'Pause' : 'Play'}
          >
            {s.loading
              ? <span className="w-4 h-4 rounded-full border-2 border-bg/40 border-t-bg animate-spin" />
              : <Icon name={s.playing ? 'pause' : 'play'} size={17} fill={s.playing ? 'none' : 'currentColor'} />}
          </button>

          <button
            onClick={() => player.next()}
            className="tap p-2 rounded-full text-muted hover:text-ink active:bg-bg"
            aria-label={isSurahMode ? 'Forward 30 seconds' : 'Next ayah'}
          >
            <Icon name="forward" size={19} />
          </button>

          <button
            onClick={() => player.stop()}
            className="tap p-2 rounded-full text-muted hover:text-ink active:bg-bg"
            aria-label="Stop"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
      </div>

      <PlayerSheet
        open={expanded} onClose={() => setExpanded(false)}
        state={s} catalogue={catalogue} ayahCount={ayahCount}
        surahName={surahName} onSelectReciter={onSelectReciter}
      />
    </>
  )
}

function PlayerSheet({ open, onClose, state: s, catalogue, ayahCount, surahName, onSelectReciter }) {
  const [tab, setTab] = useState('controls')
  const isSurahMode = s.reciter?.mode === 'surah'

  return (
    <Sheet open={open} onClose={onClose} title={surahName || 'Recitation'}>
      <div className="flex gap-2 px-4 py-3 border-b border-line">
        {[['controls', 'Controls'], ['range', 'Ayah range'], ['reciter', 'Reciter']].map(([id, label]) => (
          <button
            key={id} onClick={() => setTab(id)}
            className={`tap chip px-3.5 py-1.5 rounded-full text-xs border transition-colors ${
              tab === id ? 'border-brand bg-brand/10 text-brand' : 'border-line text-muted'
            }`}
          >{label}</button>
        ))}
      </div>

      {tab === 'controls' && (
        <div className="py-2">
          <div className="px-4 py-4">
            <input
              type="range" min={0} max={Math.max(1, s.duration)} step={0.5} value={s.time}
              onChange={e => player.seek(Number(e.target.value))}
              className="w-full accent-[rgb(var(--c-brand))]"
              aria-label="Seek"
            />
            <div className="flex justify-between text-[11px] text-muted tabular-nums mt-1">
              <span>{fmtClock(s.time)}</span>
              <span>{fmtClock(s.duration)}</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 py-2">
            <button onClick={() => player.previous()} className="tap p-3 text-muted" aria-label="Previous">
              <Icon name="back" size={24} />
            </button>
            <button
              onClick={() => player.playPause()}
              className="tap w-16 h-16 rounded-full bg-brand text-bg grid place-items-center"
              aria-label={s.playing ? 'Pause' : 'Play'}
            >
              <Icon name={s.playing ? 'pause' : 'play'} size={26} fill={s.playing ? 'none' : 'currentColor'} />
            </button>
            <button onClick={() => player.next()} className="tap p-3 text-muted" aria-label="Next">
              <Icon name="forward" size={24} />
            </button>
          </div>

          <div className="px-4 pt-4 pb-1 text-xs font-semibold uppercase tracking-wider text-muted">
            Repeat {isSurahMode ? 'the surah' : 'each ayah'}
          </div>
          <Choice
            columns={4} value={s.repeat} onChange={v => player.setRepeat(v)}
            options={REPEATS.map(v => ({ id: v, label: v === 1 ? 'Off' : v === Infinity ? '∞' : `${v}×` }))}
          />

          <div className="px-4 pt-5 pb-1 text-xs font-semibold uppercase tracking-wider text-muted">
            Pause between ayahs
          </div>
          <Choice
            columns={6} value={s.delay} onChange={v => player.setDelay(v)}
            options={DELAYS.map(v => ({ id: v, label: v === 0 ? 'None' : `${v}s` }))}
          />
          <p className="px-4 pt-2 text-[11px] text-muted leading-relaxed">
            Silence after each ayah, for repeating it back while memorising.
          </p>

          <div className="px-4 pt-5 pb-1 text-xs font-semibold uppercase tracking-wider text-muted">Speed</div>
          <Choice
            columns={6} value={s.speed} onChange={v => player.setSpeed(v)}
            options={SPEEDS.map(v => ({ id: v, label: `${v}×` }))}
          />

          <div className="mt-4 border-t border-line">
            {!isSurahMode && (
              <Toggle
                checked={s.autoAdvance} onChange={v => player.setAutoAdvance(v)}
                label="Continue to the next ayah"
                hint="Turn off to stop at the end of each ayah"
              />
            )}
            <Toggle
              checked={s.continuous} onChange={v => player.setContinuous(v)}
              label="Continue to the next surah"
              hint={s.range
                ? 'A repeat range is set, so playback stays inside it'
                : 'Keep reciting past the end of this surah'}
            />
            {!isSurahMode && (
              <Toggle
                checked={s.preloadSurah} onChange={v => player.setPreloadSurah(v)}
                label="Fetch the whole surah first"
                hint="Waits until every ayah is on the device before starting. Only worth it on a connection too slow to keep up — a few ayahs are always fetched ahead anyway."
              />
            )}
          </div>
        </div>
      )}

      {tab === 'range' && (
        <RangeTab state={s} ayahCount={ayahCount} isSurahMode={isSurahMode} />
      )}

      {tab === 'reciter' && (
        <ReciterList
          catalogue={catalogue} currentId={s.reciter?.id}
          onSelect={id => { onSelectReciter(id); setTab('controls') }}
        />
      )}
    </Sheet>
  )
}

function RangeTab({ state: s, ayahCount, isSurahMode }) {
  const [from, setFrom] = useState(s.range?.from ?? s.ayah ?? 1)
  const [to, setTo] = useState(s.range?.to ?? Math.min((s.ayah ?? 1) + 4, ayahCount || 1))

  useEffect(() => {
    if (s.range) { setFrom(s.range.from); setTo(s.range.to) }
  }, [s.range])

  if (isSurahMode) {
    return (
      <div className="p-6 text-center">
        <Icon name="warn" size={24} className="text-amber-500 mx-auto" />
        <p className="text-sm mt-3">This reciter is a full-surah recording</p>
        <p className="text-xs text-muted mt-2 leading-relaxed">
          {s.reciter.name} is available as one file per surah, not one per ayah, so an ayah range
          cannot be looped. Pick a per-ayah reciter on the Reciter tab — they are marked
          “ayah control” — to use this.
        </p>
      </div>
    )
  }

  const max = ayahCount || 1
  return (
    <div className="p-4">
      <p className="text-xs text-muted leading-relaxed mb-4">
        Loop a span of ayahs over and over. Useful for memorising: set the span, set a repeat
        count on the Controls tab, and leave it running.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <NumberField label="From ayah" value={from} min={1} max={max} onChange={setFrom} />
        <NumberField label="To ayah" value={to} min={1} max={max} onChange={setTo} />
      </div>

      <div className="flex gap-2 mt-4">
        <Button size="md" className="flex-1" onClick={() => player.setRange(from, to)}>
          <Icon name="play" size={14} fill="currentColor" />
          Loop {Math.min(from, to)}–{Math.max(from, to)}
        </Button>
        {s.range && (
          <Button size="md" variant="soft" onClick={() => player.clearRange()}>Clear</Button>
        )}
      </div>

      {s.range && (
        <p className="text-xs text-brand mt-3 flex items-center gap-1.5">
          <Icon name="reset" size={13} />
          Looping ayahs {s.range.from}–{s.range.to} of {max}
        </p>
      )}

      <div className="mt-6 pt-4 border-t border-line">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">Quick spans</p>
        <div className="grid grid-cols-3 gap-2">
          {[3, 5, 10].map(n => (
            <button
              key={n}
              onClick={() => {
                const start = s.ayah || 1
                const end = Math.min(start + n - 1, max)
                setFrom(start); setTo(end); player.setRange(start, end)
              }}
              className="tap px-3 py-2 rounded-xl border border-line text-xs text-muted hover:text-ink"
            >
              Next {n} ayahs
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function NumberField({ label, value, min, max, onChange }) {
  const clamp = v => Math.max(min, Math.min(max, v))
  return (
    <label className="block">
      <span className="block text-[11px] text-muted mb-1.5">{label}</span>
      <div className="flex items-center gap-1">
        <button onClick={() => onChange(clamp(value - 1))} className="tap p-2 rounded-lg bg-bg border border-line text-muted">
          <Icon name="minus" size={13} />
        </button>
        <input
          type="number" value={value} min={min} max={max}
          onChange={e => onChange(clamp(Number(e.target.value) || min))}
          className="w-full px-2 py-1.5 rounded-lg bg-bg border border-line text-sm text-center tabular-nums outline-none focus:border-brand"
        />
        <button onClick={() => onChange(clamp(value + 1))} className="tap p-2 rounded-lg bg-bg border border-line text-muted">
          <Icon name="plus" size={13} />
        </button>
      </div>
    </label>
  )
}

export function ReciterList({ catalogue, currentId, onSelect }) {
  const [q, setQ] = useState('')
  // Choosing a reciter starts the real player; a sample still going underneath
  // it would be two recitations at once.
  useEffect(() => () => stopPreview(), [])
  if (!catalogue) return <p className="p-6 text-center text-sm text-muted">Loading reciters…</p>

  const groups = groupReciters(catalogue)
  const needle = q.trim().toLowerCase()
  const filtered = groups
    .map(g => ({ ...g, reciters: g.reciters.filter(r => !needle || r.name.toLowerCase().includes(needle)) }))
    .filter(g => g.reciters.length)

  return (
    <div className="pb-4">
      <div className="px-4 py-3">
        <input
          value={q} onChange={e => setQ(e.target.value)}
          placeholder="Search reciters"
          className="w-full px-4 py-2.5 rounded-xl bg-bg border border-line text-sm outline-none focus:border-brand"
        />
      </div>

      {filtered.map(g => (
        <section key={g.id} className="mb-3">
          <h4 className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted">{g.label}</h4>
          <div className="px-4 space-y-2">
            {g.reciters.map(r => (
              // Beside the row, not inside it: a button cannot contain a button,
              // and hearing someone must not be the same gesture as choosing them.
              <div key={r.id} className="flex items-center gap-2">
                <button
                  onClick={() => { stopPreview(); onSelect(r.id) }}
                  className={`tap flex-1 min-w-0 text-left px-3 py-2.5 rounded-xl border ${
                    currentId === r.id ? 'border-brand bg-brand/10' : 'border-line bg-bg'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm truncate">{r.name}</span>
                      <span className="block text-[11px] text-muted truncate">
                        {r.style}{r.note ? ` · ${r.note}` : ''}
                      </span>
                    </span>
                    <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-md border ${
                      r.mode === 'ayah'
                        ? 'border-brand/40 text-brand'
                        : 'border-line text-muted'
                    }`}>
                      {r.mode === 'ayah' ? 'ayah control' : 'full surah'}
                    </span>
                  </span>
                </button>
                <ReciterPreview reciter={r} />
              </div>
            ))}
          </div>
        </section>
      ))}

      {!filtered.length && <p className="px-6 py-8 text-center text-sm text-muted">No reciter matches “{q}”.</p>}

      <p className="px-6 pt-4 text-[11px] text-muted/80 leading-relaxed border-t border-line mt-2">
        <Icon name="info" size={12} className="inline mr-1 -mt-0.5" />
        {catalogue.aqsaNote}
      </p>
    </div>
  )
}
