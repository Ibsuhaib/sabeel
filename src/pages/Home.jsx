import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSettings } from '../lib/settings.jsx'
import { nextPrayer, timesFor, PRAYERS } from '../lib/prayer.js'
import { hijri, upcomingEvents, isRamadan } from '../lib/hijri.js'
import { fmtTime, fmtCountdown } from '../lib/format.js'
import { store } from '../lib/store.js'
import { quranMeta } from '../lib/data.js'
import { progress as khatmProgress } from '../lib/khatm.js'
import { readLog, streak, secondsOn, fmtDuration, DEFAULT_GOAL_MIN } from '../lib/reading.js'
import { Screen, Card, Section, IconButton, Button } from '../components/ui.jsx'
import MenuSheet from '../components/MenuSheet.jsx'
import ReadingJourney from '../components/ReadingJourney.jsx'
import Icon from '../components/Icon.jsx'

// Surahs people actually open by name rather than by number.
const QUICK_LINKS = [
  { n: 36, label: 'Yaseen' },
  { n: 67, label: 'Al-Mulk' },
  { n: 18, label: 'Al-Kahf' },
  { n: 55, label: 'Ar-Rahman' },
  { n: 56, label: "Al-Waqi'ah" },
  { n: 2, label: 'Ayatul Kursi', ayah: 255 },
  { n: 112, label: 'Al-Ikhlas' }
]

export default function Home() {
  const { settings } = useSettings()
  const [now, setNow] = useState(new Date())
  const [last, setLast] = useState(null)
  const [khatm, setKhatm] = useState(null)
  const [meta, setMeta] = useState(null)
  const [log, setLog] = useState(null)
  const [sheet, setSheet] = useState(null)

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    store.lastRead().then(setLast)
    store.khatm().then(p => setKhatm(p || null))
    quranMeta().then(setMeta).catch(() => {})
    readLog().then(setLog)
  }, [])

  const next = settings.location ? nextPrayer(settings, now) : null
  const today = settings.location ? timesFor(settings, now) : null
  const h = hijri(now, settings.hijriOffset)
  const events = upcomingEvents(settings.hijriOffset, 2)
  const ramadan = isRamadan(now, settings.hijriOffset)
  const goal = settings.readingGoalMinutes ?? DEFAULT_GOAL_MIN
  const days = log ? streak(log, goal) : 0
  const readToday = log ? secondsOn(log) : 0
  const surahName = n => meta?.surahs.find(s => s.n === n)?.en

  return (
    <Screen>
      <header className="safe-t px-3 pt-3 pb-1 flex items-center gap-1">
        <button
          onClick={() => setSheet('menu')}
          aria-label="Open menu"
          className="tap touch-min grid place-items-center rounded-full text-muted active:bg-surf"
        >
          <Icon name="menu" size={22} strokeWidth={2} />
        </button>
        <div className="flex-1 min-w-0 px-1">
          <div className="text-[13px] font-semibold tracking-wide text-brand">Sabeel</div>
          <div className="text-[11px] text-muted truncate">{h.formatted}</div>
        </div>
        <button
          onClick={() => setSheet('journey')}
          aria-label={`Reading streak: ${days} days`}
          className="tap chip gap-1.5 px-3 rounded-full text-brand active:bg-surf"
        >
          <Icon name="bolt" size={15} fill="currentColor" strokeWidth={1} />
          <span className="text-sm font-semibold tabular-nums">{days}</span>
        </button>
        <IconButton name="search" label="Search" to="/search" />
      </header>

      <div className="px-4 mt-2">
        {next ? (
          <Card className="p-5 relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-36 h-36 rounded-full bg-brand/10" />
            <div className="relative">
              <div className="text-xs text-muted">Next prayer{next.isNextDay ? ' · tomorrow' : ''}</div>
              <div className="flex items-baseline gap-3 mt-1">
                <h1 className="text-3xl font-semibold">{next.label}</h1>
                <span className="text-xl text-brand tabular-nums">{fmtTime(next.time)}</span>
              </div>
              <div className="text-sm text-muted mt-1 tabular-nums">in {fmtCountdown(next.time - now)}</div>

              <div className="flex gap-1 mt-5 -mx-1">
                {PRAYERS.filter(p => p.isPrayer).map(p => {
                  const active = next.id === p.id
                  const passed = today && today[p.id] < now && !active
                  return (
                    <Link
                      key={p.id} to="/prayer"
                      className={`tap flex-1 px-1 py-1 rounded-lg text-center ${
                        active ? 'text-brand bg-brand/10' : passed ? 'text-muted/50' : 'text-muted'
                      }`}
                    >
                      <div className="text-[10px] uppercase tracking-wide">{p.label}</div>
                      <div className="text-xs tabular-nums mt-0.5">{today ? fmtTime(today[p.id]) : '--:--'}</div>
                    </Link>
                  )
                })}
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-5">
            <div className="flex items-start gap-3">
              <span className="text-muted mt-0.5"><Icon name="location" size={20} /></span>
              <div className="flex-1">
                <p className="font-medium text-[15px]">Set a location for prayer times</p>
                <p className="text-xs text-muted mt-1">Calculated on your device. It never leaves your phone.</p>
                <Button to="/settings" variant="soft" size="sm" className="mt-3">Choose location</Button>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Continue reading — the second of the two things that belong above the fold. */}
      <div className="px-4 mt-3">
        <Card as={Link} to={last ? `/quran/${last.surah}?ayah=${last.ayah}` : '/quran/1'} className="p-4 flex items-center gap-3 tap block">
          <span className="w-11 h-11 rounded-xl bg-brand/10 text-brand grid place-items-center shrink-0">
            <Icon name="quran" size={21} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs text-muted">{last ? 'Continue reading' : 'Start reading'}</span>
            <span className="block font-medium truncate">
              {last ? `${surahName(last.surah) || `Surah ${last.surah}`} · Ayah ${last.ayah}` : 'Al-Fatihah'}
            </span>
            {readToday > 0 && (
              <span className="block text-[11px] text-brand mt-0.5 tabular-nums">{fmtDuration(readToday)} read today</span>
            )}
          </span>
          <Icon name="forward" size={18} className="text-muted" />
        </Card>
      </div>

      {khatm && (() => {
        const kp = khatmProgress(khatm)
        if (kp.finished) return null
        return (
          <div className="px-4 mt-3">
            <Card as={Link} to="/khatm" className="p-4 flex items-center gap-3 tap block">
              <span className="w-11 h-11 grid place-items-center shrink-0 relative">
                <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90 w-11 h-11">
                  <circle cx="18" cy="18" r="15" fill="none" stroke="rgb(var(--c-line))" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15" fill="none" strokeWidth="3" strokeLinecap="round"
                    stroke={kp.status === 'behind' ? 'rgb(var(--c-gold))' : 'rgb(var(--c-brand))'}
                    strokeDasharray={2 * Math.PI * 15}
                    strokeDashoffset={2 * Math.PI * 15 * (1 - kp.percent / 100)}
                  />
                </svg>
                <span className="relative text-[10px] font-semibold tabular-nums">{Math.round(kp.percent)}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs text-muted truncate">
                  {khatm.label} · {kp.daysLeft} day{kp.daysLeft === 1 ? '' : 's'} left
                </span>
                <span className="block font-medium truncate tabular-nums">
                  {kp.today.pages > 0 ? `Today: ${kp.today.pages} pages (${kp.today.from}–${kp.today.to})` : 'Today is done'}
                </span>
              </span>
              <Icon name="forward" size={18} className="text-muted shrink-0" />
            </Card>
          </div>
        )
      })()}

      {ramadan && (
        <div className="px-4 mt-3">
          <Card className="p-4 border-gold/40">
            <div className="flex items-center gap-3">
              <span className="text-gold"><Icon name="moon" size={20} /></span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">Ramadan Mubarak</p>
                <p className="text-xs text-muted mt-0.5 tabular-nums">
                  {today && now < today.fajr ? `Suhoor ends in ${fmtCountdown(today.fajr - now)}`
                    : today && now < today.maghrib ? `Iftar in ${fmtCountdown(today.maghrib - now)}`
                    : 'Ramadan Kareem'}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      <Section title="Jump to">
        <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 pb-1">
          {QUICK_LINKS.map(q => (
            <Link
              key={q.label}
              to={`/quran/${q.n}${q.ayah ? `?ayah=${q.ayah}` : ''}`}
              className="tap chip shrink-0 px-4 rounded-full border border-line bg-surf text-sm text-ink active:border-brand/50"
            >{q.label}</Link>
          ))}
        </div>
      </Section>

      <Section title="Quick access">
        <div className="grid grid-cols-4 gap-2 px-4">
          <Tile to="/mushaf/1" icon="book" label="Muṣḥaf" />
          <Tile to="/dua/tasbih" icon="counter" label="Tasbih" />
          <Tile to="/qibla" icon="compass" label="Qibla" />
          <Tile to="/dua/morning-dhikr" icon="sunrise" label="Adhkar" />
          <Tile to="/khatm" icon="calendar" label="Khatm" />
          <Tile to="/tracker" icon="chart" label="Tracker" />
          <Tile to="/hadith/lookup" icon="hadith" label="Lookup" />
          <Tile to="/bookmarks" icon="bookmark" label="Saved" />
        </div>
      </Section>

      {events.length > 0 && (
        <Section title="Coming up">
          <div className="px-4 space-y-2">
            {events.map(e => (
              <Card key={e.name} as={Link} to="/calendar" className="px-4 py-3 flex items-center gap-3 tap block">
                <span className="text-gold shrink-0"><Icon name="star" size={18} /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{e.name}</p>
                  <p className="text-xs text-muted mt-0.5">
                    {e.inDays === 0 ? 'Today' : e.inDays === 1 ? 'Tomorrow' : `In ${e.inDays} days`}
                    {' · '}{e.date.toLocaleDateString([], { day: 'numeric', month: 'short' })}
                  </p>
                </div>
                <Icon name="forward" size={16} className="text-muted shrink-0" />
              </Card>
            ))}
          </div>
        </Section>
      )}

      <p className="text-[11px] text-muted/70 text-center px-10 mt-8 leading-relaxed">
        No ads. No tracking. No account. Everything you save stays on this device.
      </p>

      <MenuSheet open={sheet === 'menu'} onClose={() => setSheet(null)} />
      <ReadingJourney
        open={sheet === 'journey'}
        // Re-read on close so the header streak reflects a goal changed inside
        // the sheet rather than staying stale until the screen remounts.
        onClose={() => { setSheet(null); readLog().then(setLog) }}
      />
    </Screen>
  )
}

function Tile({ to, icon, label }) {
  return (
    <Link to={to} className="tap flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-surf border border-line active:bg-bg min-h-[68px]">
      <Icon name={icon} size={20} className="text-brand" />
      <span className="text-[11px] text-muted text-center leading-tight">{label}</span>
    </Link>
  )
}
