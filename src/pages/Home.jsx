import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSettings } from '../lib/settings.jsx'
import { nextPrayer, timesFor, PRAYERS } from '../lib/prayer.js'
import { hijri, upcomingEvents, isRamadan } from '../lib/hijri.js'
import { fmtTime, fmtCountdown } from '../lib/format.js'
import { store } from '../lib/store.js'
import { surahInfo } from '../lib/data.js'
import { Screen, Card, Section, IconButton, Button } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'

// Two things above the fold: the next prayer, and where you left off reading.
// Nothing else. Part 6.
export default function Home() {
  const { settings } = useSettings()
  const [now, setNow] = useState(new Date())
  const [last, setLast] = useState(null)

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    store.lastRead().then(async lr => {
      if (!lr) return
      const info = await surahInfo(lr.surah).catch(() => null)
      setLast(info ? { ...lr, info } : null)
    })
  }, [])

  const next = settings.location ? nextPrayer(settings, now) : null
  const today = settings.location ? timesFor(settings, now) : null
  const h = hijri(now, settings.hijriOffset)
  const events = upcomingEvents(settings.hijriOffset, 2)
  const ramadan = isRamadan(now, settings.hijriOffset)

  return (
    <Screen>
      <header className="safe-t px-4 pt-4 pb-2 flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-[11px] uppercase tracking-widest text-brand font-semibold">Sabeel</div>
          <div className="text-xs text-muted mt-0.5">{h.formatted}</div>
        </div>
        <IconButton name="search" label="Search" to="/search" />
        <IconButton name="bookmark" label="Bookmarks" to="/bookmarks" />
      </header>

      <div className="px-4 mt-2">
        {next ? (
          <Card className="p-5 relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-brand/10" />
            <div className="relative">
              <div className="text-xs text-muted">Next prayer{next.isNextDay ? ' · tomorrow' : ''}</div>
              <div className="flex items-baseline gap-3 mt-1">
                <h1 className="text-3xl font-semibold">{next.label}</h1>
                <span className="text-xl text-brand tabular-nums">{fmtTime(next.time)}</span>
              </div>
              <div className="text-sm text-muted mt-1 tabular-nums">
                in {fmtCountdown(next.time - now)}
              </div>

              <div className="flex gap-1 mt-5 -mx-1">
                {PRAYERS.filter(p => p.isPrayer).map(p => {
                  const active = next.id === p.id
                  const passed = today && today[p.id] < now && !active
                  return (
                    <div key={p.id} className={`flex-1 px-1 text-center ${active ? 'text-brand' : passed ? 'text-muted/50' : 'text-muted'}`}>
                      <div className="text-[10px] uppercase tracking-wide">{p.label}</div>
                      <div className="text-xs tabular-nums mt-0.5">{today ? fmtTime(today[p.id]) : '--:--'}</div>
                    </div>
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

      <div className="px-4 mt-3">
        {last ? (
          <Card as={Link} to={`/quran/${last.surah}?ayah=${last.ayah}`} className="p-4 flex items-center gap-3 tap block">
            <span className="w-10 h-10 rounded-xl bg-brand/10 text-brand grid place-items-center shrink-0">
              <Icon name="quran" size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs text-muted">Continue reading</span>
              <span className="block font-medium truncate">{last.info.en} · Ayah {last.ayah}</span>
            </span>
            <Icon name="forward" size={18} className="text-muted" />
          </Card>
        ) : (
          <Card as={Link} to="/quran/1" className="p-4 flex items-center gap-3 tap block">
            <span className="w-10 h-10 rounded-xl bg-brand/10 text-brand grid place-items-center shrink-0">
              <Icon name="quran" size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs text-muted">Start reading</span>
              <span className="block font-medium">Al-Fatihah</span>
            </span>
            <Icon name="forward" size={18} className="text-muted" />
          </Card>
        )}
      </div>

      {ramadan && (
        <div className="px-4 mt-3">
          <Card className="p-4 border-gold/40">
            <div className="flex items-center gap-3">
              <span className="text-gold"><Icon name="moon" size={20} /></span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">Ramadan Mubarak</p>
                <p className="text-xs text-muted mt-0.5 tabular-nums">
                  {today && now < today.fajr
                    ? `Suhoor ends in ${fmtCountdown(today.fajr - now)}`
                    : today && now < today.maghrib
                      ? `Iftar in ${fmtCountdown(today.maghrib - now)}`
                      : 'Ramadan Kareem'}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      <Section title="Quick access">
        <div className="grid grid-cols-4 gap-2 px-4">
          <Tile to="/dua/tasbih" icon="counter" label="Tasbih" />
          <Tile to="/qibla" icon="compass" label="Qibla" />
          <Tile to="/dua/morning-dhikr" icon="sunrise" label="Adhkar" />
          <Tile to="/tracker" icon="chart" label="Tracker" />
        </div>
      </Section>

      {events.length > 0 && (
        <Section title="Coming up">
          <div className="px-4 space-y-2">
            {events.map(e => (
              <Card key={e.name} className="px-4 py-3 flex items-center gap-3">
                <span className="text-gold shrink-0"><Icon name="star" size={18} /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{e.name}</p>
                  <p className="text-xs text-muted mt-0.5">
                    {e.inDays === 0 ? 'Today' : e.inDays === 1 ? 'Tomorrow' : `In ${e.inDays} days`}
                    {' · '}{e.date.toLocaleDateString([], { day: 'numeric', month: 'short' })}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </Section>
      )}

      <p className="text-[11px] text-muted/70 text-center px-10 mt-8 leading-relaxed">
        No ads. No tracking. No account. Everything you save stays on this device.
      </p>
    </Screen>
  )
}

function Tile({ to, icon, label }) {
  return (
    <Link to={to} className="tap flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-surf border border-line active:bg-bg">
      <Icon name={icon} size={20} className="text-brand" />
      <span className="text-[11px] text-muted">{label}</span>
    </Link>
  )
}
