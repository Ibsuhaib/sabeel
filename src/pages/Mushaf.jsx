import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { pageAyahs, quranMeta } from '../lib/data.js'
import { useData } from '../lib/useData.js'
import { store } from '../lib/store.js'
import { useSettings } from '../lib/settings.jsx'
import { player } from '../lib/audio.js'
import { usePlayer, loadReciters } from '../lib/reciters.js'
import { toArabicNumber } from '../lib/format.js'
import { Loading, LoadError, Sheet, IconButton, Button, Choice } from '../components/ui.jsx'
import { ReciterList } from '../components/Player.jsx'
import SwipePager from '../components/SwipePager.jsx'
import SurahBanner from '../components/SurahBanner.jsx'
import { useReadingTimer } from '../lib/useReadingTimer.js'
import Icon from '../components/Icon.jsx'

const BISMILLAH = 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ'
const TOTAL_PAGES = 604

// The muṣḥaf page. One page of the 604-page Madani layout at a time, text
// flowing and justified the way it does on paper — not an endless scroll.
// Turning a page moves right-to-left, as it does in the book.
export default function Mushaf() {
  const { page: pageParam } = useParams()
  const page = Math.min(TOTAL_PAGES, Math.max(1, Number(pageParam) || 1))
  const nav = useNavigate()
  const { settings, set } = useSettings()

  const { data, error, retry } = useData(
    () => Promise.all([pageAyahs(page), quranMeta()]).then(([p, meta]) => ({ ...p, meta })),
    [page],
    { label: 'this page' }
  )

  const [selected, setSelected] = useState(null)
  const [sheet, setSheet] = useState(null)
  const [bookmarks, setBookmarks] = useState([])
  const [catalogue, setCatalogue] = useState(null)
  const [followRecitation, setFollowRecitation] = useState(true)

  const audio = usePlayer()
  const [autoScroll, setAutoScroll] = useState(false)

  // Time on this screen counts towards the reading streak.
  useReadingTimer(true)

  useEffect(() => { loadReciters().then(setCatalogue) }, [])
  useEffect(() => { store.bookmarksQuran().then(setBookmarks) }, [])
  useEffect(() => { setSelected(null); window.scrollTo(0, 0) }, [page])

  const go = useCallback(delta => {
    const next = page + delta
    if (next >= 1 && next <= TOTAL_PAGES) nav(`/mushaf/${next}`)
  }, [page, nav])

  useEffect(() => {
    if (data?.ayahs?.length) {
      const first = data.ayahs[0]
      store.setLastRead({ surah: first.surah, ayah: first.v, page })
    }
  }, [data, page])

  useEffect(() => {
    const onKey = e => {
      if (e.key === 'ArrowLeft') go(1)
      if (e.key === 'ArrowRight') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go])

  // Follow the recitation across page breaks. Without this, listening to a whole
  // juz in page mode would leave you staring at the page you started on.
  const playingPage = useMemo(() => {
    if (!audio.playing || !audio.ayah || !data) return null
    const here = data.ayahs.find(a => a.surah === audio.surah && a.v === audio.ayah)
    return here ? page : 'elsewhere'
  }, [audio.playing, audio.surah, audio.ayah, data, page])

  useEffect(() => {
    if (!followRecitation || playingPage !== 'elsewhere' || !audio.playing) return
    let cancelled = false
    import('../lib/data.js').then(({ pageOf }) => pageOf(audio.surah, audio.ayah)).then(p => {
      if (!cancelled && p && p !== page) nav(`/mushaf/${p}`, { replace: true })
    })
    return () => { cancelled = true }
  }, [playingPage, audio.playing, audio.surah, audio.ayah, followRecitation, page, nav])

  const bookmarked = useMemo(() => new Set(bookmarks.map(b => b.id)), [bookmarks])

  if (error) return <LoadError message={error} onRetry={retry} />
  if (!data) return <Loading label="Opening the muṣḥaf" />

  const { page: info, ayahs, meta } = data
  const surahsOnPage = [...new Set(ayahs.map(a => a.surah))]
  const title = surahsOnPage.map(n => meta.surahs.find(s => s.n === n)?.en).join(' · ')

  // Play from the top of the page you are actually looking at.
  function playPage() {
    const first = ayahs[0]
    const surahInfo = meta.surahs.find(s => s.n === first.surah)
    player.play(first.surah, first.v, surahInfo?.ayahs)
  }

  return (
    <div className="min-h-full pb-36">
      <header className="sticky top-0 z-30 safe-t bg-bg/92 backdrop-blur-md border-b border-line">
        <div className="flex items-center gap-1 px-2 h-14">
          <IconButton name="back" label="Back to surah list" onClick={() => nav('/quran')} size={22} />
          <button onClick={() => setSheet('jump')} className="tap min-w-0 flex-1 text-center px-2">
            <span className="block text-[15px] font-semibold truncate">{title}</span>
            <span className="block text-[11px] text-muted">Page {info.p} · Juz {info.juz}</span>
          </button>
          <IconButton
            name="quran" label="Switch to scrolling view"
            onClick={() => { set({ readerMode: 'scroll' }); nav(`/quran/${ayahs[0].surah}?ayah=${ayahs[0].v}`) }}
          />
          <IconButton name="play" label="Play from this page" onClick={playPage} />
          <IconButton name="settings" label="Muṣḥaf settings" onClick={() => setSheet('settings')} />
        </div>
      </header>

      <SwipePager
        pageKey={page}
        canPrev={page > 1}
        canNext={page < TOTAL_PAGES}
        onPrev={() => go(-1)}
        onNext={() => go(1)}
        className="px-4 pt-5"
      >
        <div className="border border-gold/25 rounded-2xl px-4 py-6 bg-surf/40">
          <p className="ar" style={{ textAlign: 'justify', textAlignLast: 'center' }}>
            {ayahs.map((a, i) => {
              const startsSurah = a.v === 1
              const isPlaying = audio.playing && audio.surah === a.surah && audio.ayah === a.v
              const id = `${a.surah}:${a.v}`
              return (
                <span key={id}>
                  {startsSurah && (
                    <span className="block my-5" style={{ textAlign: 'center' }}>
                      <SurahBanner surah={meta.surahs.find(s => s.n === a.surah)} />
                      {a.surah !== 1 && a.surah !== 9 && (
                        <span className="block mt-4" style={{ fontSize: '0.86em' }}>{BISMILLAH}</span>
                      )}
                    </span>
                  )}
                  <span
                    onClick={() => setSelected(selected === id ? null : id)}
                    className={`cursor-pointer transition-colors rounded ${
                      isPlaying ? 'text-brand bg-brand/10' : selected === id ? 'bg-brand/10' : ''
                    }`}
                  >
                    {a.ar}
                    <span className={`ayah-mark ${bookmarked.has(id) ? 'bg-gold/20' : ''}`}>
                      {toArabicNumber(a.v)}
                    </span>
                  </span>
                  {a.sajdah && (
                    <span className="text-gold" style={{ fontSize: '0.5em' }} title="Place of prostration"> ۩ </span>
                  )}
                  {i < ayahs.length - 1 ? ' ' : ''}
                </span>
              )
            })}
          </p>

          <div className="mt-6 pt-4 border-t border-gold/20 flex items-center justify-center gap-3">
            <span className="text-[11px] text-muted tabular-nums">{info.p}</span>
          </div>
        </div>
      </SwipePager>

      {selected && (
        <AyahBar
          id={selected} ayahs={ayahs} meta={meta}
          bookmarked={bookmarked.has(selected)}
          playing={audio.playing && `${audio.surah}:${audio.ayah}` === selected}
          onClose={() => setSelected(null)}
          onPlay={a => {
            const surahInfo = meta.surahs.find(s => s.n === a.surah)
            player.toggle(a.surah, a.v, surahInfo?.ayahs)
          }}
          onLoop={a => {
            const surahInfo = meta.surahs.find(s => s.n === a.surah)
            player.setSurahLength(surahInfo?.ayahs)
            player.setRange(a.v, Math.min(a.v + 4, surahInfo?.ayahs || a.v))
          }}
          onBookmark={async a => setBookmarks(await store.toggleQuranBookmark(a.surah, a.v, (a.en || '').slice(0, 120)))}
          translation={settings.translation}
        />
      )}

      <nav className="flex items-center justify-between gap-3 px-4 py-6">
        <Button variant="soft" size="sm" onClick={() => go(-1)} disabled={page <= 1}>
          <Icon name="forward" size={14} />Previous
        </Button>
        <button onClick={() => setSheet('jump')} className="tap chip text-xs text-muted tabular-nums px-4">
          {page} / {TOTAL_PAGES}
        </button>
        <Button variant="soft" size="sm" onClick={() => go(1)} disabled={page >= TOTAL_PAGES}>
          Next<Icon name="back" size={14} />
        </Button>
      </nav>

      <p className="text-[11px] text-muted/60 text-center px-10 pb-4">
        Swipe the page to turn it — left for the next, right to go back.
      </p>

      <MushafBar
        onContents={() => setSheet('jump')}
        autoScroll={autoScroll}
        onAutoScroll={() => setAutoScroll(v => !v)}
        onPlay={playPage}
        playing={audio.playing}
        onPause={() => player.pause()}
      />
      <AutoScroller active={autoScroll} onEnd={() => { setAutoScroll(false); go(1) }} />

      <JumpSheet
        open={sheet === 'jump'} onClose={() => setSheet(null)}
        meta={meta} current={page} onJump={p => { nav(`/mushaf/${p}`); setSheet(null) }}
      />
      <MushafSettings
        open={sheet === 'settings'} onClose={() => setSheet(null)}
        settings={settings} set={set}
        follow={followRecitation} onFollow={setFollowRecitation}
        onOpenReciters={() => setSheet('reciter')}
      />
      <Sheet open={sheet === 'reciter'} onClose={() => setSheet(null)} title="Reciter">
        <ReciterList
          catalogue={catalogue} currentId={settings.reciter}
          onSelect={id => { set({ reciter: id }); setSheet(null) }}
        />
      </Sheet>
    </div>
  )
}

function AyahBar({ id, ayahs, meta, bookmarked, playing, onClose, onPlay, onLoop, onBookmark, translation }) {
  const [sn, av] = id.split(':').map(Number)
  const a = ayahs.find(x => x.surah === sn && x.v === av)
  if (!a) return null
  const surahName = meta.surahs.find(s => s.n === sn)?.en
  const text = translation === 'e2' ? a.e2 : a.en

  return (
    <div className="px-4 mt-3">
      <div className="bg-surf border border-line rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] text-brand font-medium flex-1">{surahName} {sn}:{av}</span>
          <button onClick={onClose} className="tap text-muted p-1" aria-label="Close"><Icon name="close" size={14} /></button>
        </div>
        <p className="translation text-ink/85">{text}</p>
        <div className="flex items-center gap-1 mt-3 pt-3 border-t border-line/60">
          <Act icon={playing ? 'pause' : 'play'} label={playing ? 'Pause' : 'Play'} active={playing} onClick={() => onPlay(a)} />
          <Act icon="reset" label="Loop 5" onClick={() => onLoop(a)} />
          <Act icon="bookmark" label={bookmarked ? 'Saved' : 'Save'} active={bookmarked} onClick={() => onBookmark(a)} />
          <Act icon="quran" label="In reader" to={`/quran/${sn}?ayah=${av}`} />
        </div>
      </div>
    </div>
  )
}

function Act({ icon, label, onClick, to, active }) {
  const cls = `tap flex-1 flex flex-col items-center gap-1 py-2 rounded-xl text-[10px] ${active ? 'text-brand bg-brand/10' : 'text-muted'}`
  if (to) return <Link to={to} className={cls}><Icon name={icon} size={16} />{label}</Link>
  return <button onClick={onClick} className={cls}><Icon name={icon} size={16} fill={active && icon === 'bookmark' ? 'currentColor' : 'none'} />{label}</button>
}

function JumpSheet({ open, onClose, meta, current, onJump }) {
  const [tab, setTab] = useState('surah')
  const [pageInput, setPageInput] = useState(String(current))

  return (
    <Sheet open={open} onClose={onClose} title="Go to">
      <div className="flex gap-2 px-4 py-3 border-b border-line">
        {[['surah', 'Surah'], ['juz', 'Juz'], ['page', 'Page']].map(([id, label]) => (
          <button
            key={id} onClick={() => setTab(id)}
            className={`tap chip px-3.5 py-1.5 rounded-full text-xs border ${
              tab === id ? 'border-brand bg-brand/10 text-brand' : 'border-line text-muted'
            }`}
          >{label}</button>
        ))}
      </div>

      {tab === 'page' && (
        <div className="p-4">
          <label className="block text-[11px] text-muted mb-1.5">Page number (1–604)</label>
          <div className="flex gap-2">
            <input
              type="number" min={1} max={604} value={pageInput}
              onChange={e => setPageInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onJump(Math.min(604, Math.max(1, Number(pageInput) || 1)))}
              className="flex-1 px-4 py-2.5 rounded-xl bg-bg border border-line text-sm tabular-nums outline-none focus:border-brand"
            />
            <Button onClick={() => onJump(Math.min(604, Math.max(1, Number(pageInput) || 1)))}>Go</Button>
          </div>
        </div>
      )}

      {tab === 'surah' && (
        <ul className="divide-y divide-line">
          {meta.surahs.map(s => (
            <li key={s.n}>
              <button onClick={() => onJump(s.page)} className="tap w-full flex items-center gap-3 px-4 py-2.5 text-left">
                <span className="w-7 text-xs tabular-nums text-muted">{s.n}</span>
                <span className="flex-1 text-sm truncate">{s.en}</span>
                <span className="text-[11px] text-muted tabular-nums">p. {s.page}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {tab === 'juz' && (
        <ul className="divide-y divide-line">
          {Array.from({ length: 30 }, (_, i) => i + 1).map(j => {
            const p = meta.pages.find(x => x.juz === j)
            return (
              <li key={j}>
                <button onClick={() => onJump(p?.p || 1)} className="tap w-full flex items-center gap-3 px-4 py-2.5 text-left">
                  <span className="flex-1 text-sm">Juz {j}</span>
                  <span className="text-[11px] text-muted tabular-nums">p. {p?.p}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Sheet>
  )
}

function MushafSettings({ open, onClose, settings, set, follow, onFollow, onOpenReciters }) {
  return (
    <Sheet open={open} onClose={onClose} title="Muṣḥaf settings">
      <div className="py-2">
        <div className="px-4 pt-2 pb-1 text-xs font-semibold uppercase tracking-wider text-muted">View</div>
        <Choice
          columns={2} value={settings.readerMode} onChange={v => set({ readerMode: v })}
          options={[
            { id: 'mushaf', label: 'Muṣḥaf pages', note: 'You are here' },
            { id: 'scroll', label: 'Scrolling', note: 'Use the header button to switch' }
          ]}
        />

        <div className="px-4 py-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">Arabic size</div>
          <input
            type="range" min={20} max={54} value={settings.arabicSize}
            onChange={e => set({ arabicSize: Number(e.target.value) })}
            className="w-full accent-[rgb(var(--c-brand))]"
          />
        </div>
        <div className="px-4 pb-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">Line spacing</div>
          <input
            type="range" min={1.6} max={3.4} step={0.1} value={settings.arabicLeading}
            onChange={e => set({ arabicLeading: Number(e.target.value) })}
            className="w-full accent-[rgb(var(--c-brand))]"
          />
        </div>

        <div className="px-4 pt-2 pb-1 text-xs font-semibold uppercase tracking-wider text-muted">Arabic font</div>
        <div className="px-4 space-y-2 pb-4">
          {['Amiri Quran', 'Scheherazade New', 'Noto Naskh Arabic'].map(f => (
            <button
              key={f} onClick={() => set({ arabicFont: f })}
              className={`tap w-full text-left px-3 py-2.5 rounded-xl border text-sm ${
                settings.arabicFont === f ? 'border-brand bg-brand/10' : 'border-line bg-bg text-muted'
              }`}
            >{f}</button>
          ))}
        </div>

        <div className="border-t border-line">
          <button
            onClick={() => onFollow(!follow)} role="switch" aria-checked={follow}
            className="tap w-full flex items-center gap-3 px-4 py-3 text-left"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[15px]">Turn pages with the recitation</span>
              <span className="block text-xs text-muted mt-0.5">Follow the reciter across page breaks</span>
            </span>
            <span className={`shrink-0 w-11 h-6 rounded-full p-0.5 transition-colors ${follow ? 'bg-brand' : 'bg-line'}`}>
              <span className={`block w-5 h-5 rounded-full bg-surf transition-transform ${follow ? 'translate-x-5' : ''}`} />
            </span>
          </button>
        </div>

        <div className="px-4 pt-3 pb-2">
          <Button variant="soft" size="lg" onClick={onOpenReciters}>
            <Icon name="play" size={15} />Choose a reciter
          </Button>
        </div>

        <p className="px-6 pb-4 text-[11px] text-muted/80 leading-relaxed">
          Page mode shows the Quran in the 604-page Madani layout, one page at a time.
          Line breaks follow the text flow at your chosen size rather than the printed
          muṣḥaf's exact line endings — matching those needs the page-specific KFGQPC
          fonts, which are not yet bundled.
        </p>
      </div>
    </Sheet>
  )
}

/* ------------------------- reader bottom bar ----------------------------- */

// The four things you reach for while actually reading a page, on the thumb
// rail rather than buried in the header.
function MushafBar({ onContents, autoScroll, onAutoScroll, onPlay, playing, onPause }) {
  const items = [
    { icon: 'book', label: 'Contents', onClick: onContents },
    { icon: 'autoscroll', label: 'Auto scroll', onClick: onAutoScroll, active: autoScroll },
    { icon: playing ? 'pause' : 'play', label: playing ? 'Pause' : 'Play', onClick: playing ? onPause : onPlay, active: playing },
    { icon: 'calendar', label: 'Plan', to: '/khatm' }
  ]
  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 bg-bg/95 backdrop-blur-md border-t border-line safe-b">
      <div className="flex max-w-2xl mx-auto">
        {items.map(i => {
          const inner = (
            <>
              <Icon name={i.icon} size={19} />
              <span className="text-[10px]">{i.label}</span>
            </>
          )
          const cls = `tap flex-1 flex flex-col items-center gap-1 py-2.5 min-h-[56px] ${i.active ? 'text-brand' : 'text-muted'}`
          return i.to
            ? <Link key={i.label} to={i.to} className={cls}>{inner}</Link>
            : <button key={i.label} onClick={i.onClick} className={cls}>{inner}</button>
        })}
      </div>
    </nav>
  )
}

// Creeps the page down at a readable pace, and turns to the next page when it
// reaches the bottom so a whole juz can be read without touching the screen.
function AutoScroller({ active, onEnd }) {
  useEffect(() => {
    if (!active) return
    let raf = 0
    let last = performance.now()
    const PX_PER_SEC = 22

    const step = now => {
      const dt = now - last
      last = now
      window.scrollBy(0, (PX_PER_SEC * dt) / 1000)
      const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4
      if (atEnd) { onEnd?.(); return }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)

    // Any touch pauses it — you have taken over.
    const stop = () => { cancelAnimationFrame(raf); onEnd?.() }
    window.addEventListener('pointerdown', stop, { once: true })
    return () => { cancelAnimationFrame(raf); window.removeEventListener('pointerdown', stop) }
  }, [active, onEnd])
  return null
}

