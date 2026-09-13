import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSettings } from '../lib/settings.jsx'
import { timesFor, nextPrayer, explain, duhaWindow, PRAYERS, FARD } from '../lib/prayer.js'
import { fmtTime, fmtCountdown, dateKey } from '../lib/format.js'
import { hijri } from '../lib/hijri.js'
import { store } from '../lib/store.js'
import { Screen, Header, Card, Section, Sheet, IconButton, Button, Empty } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'

export default function Prayer() {
  const { settings } = useSettings()
  const [now, setNow] = useState(new Date())
  const [offset, setOffset] = useState(0)          // days from today
  const [why, setWhy] = useState(false)
  const [log, setLog] = useState({})

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  useEffect(() => { store.prayerLog().then(setLog) }, [])

  if (!settings.location) {
    return (
      <Screen>
        <Header title="Prayer" large />
        <Empty
          icon="location"
          title="No location set"
          body="Prayer times are calculated on this device from your coordinates. Nothing is sent anywhere."
          action={<Button to="/settings">Set location</Button>}
        />
      </Screen>
    )
  }

  const date = new Date(now.getTime() + offset * 86400000)
  const t = timesFor(settings, date)
  const next = nextPrayer(settings, now)
  const duha = duhaWindow(t)
  const h = hijri(date, settings.hijriOffset)
  const key = dateKey(date)
  const todayLog = log[key] || {}
  const isToday = offset === 0

  async function mark(prayer, state) {
    setLog(await store.logPrayer(key, prayer, todayLog[prayer] === state ? null : state))
  }

  return (
    <Screen>
      <Header
        title="Prayer"
        subtitle={settings.location.label}
        large
        actions={<IconButton name="compass" label="Qibla" to="/qibla" />}
      />

      <div className="flex items-center justify-between px-4 pt-3">
        <IconButton name="back" label="Previous day" onClick={() => setOffset(o => o - 1)} />
        <button onClick={() => setOffset(0)} className="tap text-center px-3">
          <span className="block text-sm font-medium">
            {isToday ? 'Today' : date.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}
          </span>
          <span className="block text-[11px] text-muted">{h.formatted}</span>
        </button>
        <IconButton name="forward" label="Next day" onClick={() => setOffset(o => o + 1)} />
      </div>

      {isToday && next && (
        <div className="px-4 mt-4">
          <Card className="p-4 text-center">
            <div className="text-xs text-muted">{next.label}{next.isNextDay ? ' tomorrow' : ''} in</div>
            <div className="text-3xl font-semibold text-brand tabular-nums mt-1">{fmtCountdown(next.time - now)}</div>
            <div className="text-xs text-muted mt-1">{fmtTime(next.time)}</div>
          </Card>
        </div>
      )}

      <div className="px-4 mt-4 space-y-2">
        {PRAYERS.map(p => {
          const active = isToday && next?.id === p.id
          const passed = t[p.id] < now && isToday
          const state = todayLog[p.id]
          return (
            <Card key={p.id} className={`px-4 py-3 ${active ? 'border-brand/50' : ''}`}>
              <div className="flex items-center gap-3">
                <Icon
                  name={p.id === 'sunrise' ? 'sunrise' : p.id === 'maghrib' ? 'sunset' : p.id === 'isha' ? 'moon' : 'prayer'}
                  size={18}
                  className={active ? 'text-brand' : passed ? 'text-muted/50' : 'text-muted'}
                />
                <span className={`flex-1 text-[15px] ${active ? 'text-brand font-medium' : passed ? 'text-muted' : ''}`}>
                  {p.label}
                  {!p.isPrayer && <span className="text-[10px] text-muted ml-2">not a prayer</span>}
                </span>
                <span className={`tabular-nums text-[15px] ${active ? 'text-brand font-medium' : 'text-muted'}`}>
                  {fmtTime(t[p.id])}
                </span>
              </div>

              {p.isPrayer && (
                <div className="flex gap-1.5 mt-3">
                  {[
                    ['jamaah', 'In jamaah'],
                    ['alone', 'Prayed'],
                    ['qada', 'Qada']
                  ].map(([id, label]) => (
                    <button
                      key={id} onClick={() => mark(p.id, id)}
                      className={`tap flex-1 py-1.5 rounded-lg text-[11px] border transition-colors ${
                        state === id ? 'border-brand bg-brand/10 text-brand' : 'border-line text-muted'
                      }`}
                    >{label}</button>
                  ))}
                </div>
              )}
            </Card>
          )
        })}
      </div>

      <Section title="Sunnah windows">
        <div className="px-4 space-y-2">
          <MiniRow label="Duha" value={`${fmtTime(duha.start)} – ${fmtTime(duha.end)}`} note="Forenoon prayer" />
          <MiniRow label="Last third of the night" value={fmtTime(t.lastThird)} note="Best time for tahajjud" />
          <MiniRow label="Middle of the night" value={fmtTime(t.middleOfNight)} note="Night ends at Fajr" />
        </div>
      </Section>

      <div className="px-4 mt-6 grid grid-cols-2 gap-2">
        <Button variant="soft" onClick={() => setWhy(true)}>
          <Icon name="info" size={15} />Why these times
        </Button>
        <Button variant="soft" to="/prayer/timetable">
          <Icon name="calendar" size={15} />Monthly timetable
        </Button>
      </div>

      <div className="px-4 mt-2">
        <Button variant="soft" to="/tracker" className="w-full">
          <Icon name="chart" size={15} />Prayer tracker
        </Button>
      </div>

      <WhySheet open={why} onClose={() => setWhy(false)} settings={settings} />
    </Screen>
  )
}

function MiniRow({ label, value, note }) {
  return (
    <Card className="px-4 py-2.5 flex items-center gap-3">
      <span className="min-w-0 flex-1">
        <span className="block text-sm">{label}</span>
        <span className="block text-[11px] text-muted">{note}</span>
      </span>
      <span className="text-sm text-muted tabular-nums shrink-0">{value}</span>
    </Card>
  )
}

// Part 3.3 — the transparency sheet. If a user disagrees with a time, this tells
// them exactly which knob to turn instead of leaving them to guess.
function WhySheet({ open, onClose, settings }) {
  const e = open ? explain(settings) : null
  if (!e) return null
  return (
    <Sheet open={open} onClose={onClose} title="Why these times">
      <div className="p-4 space-y-4">
        <p className="text-xs text-muted leading-relaxed">
          Nothing here comes from a server. These times are computed on your device from your
          coordinates and the parameters below, using the adhan library.
        </p>

        <Block title="Location">
          <Line k="Place" v={e.place} />
          <Line k="Coordinates" v={e.coords} />
          <Line k="Time zone" v={e.timezone} />
        </Block>

        <Block title="Calculation method">
          <Line k="Method" v={e.method} />
          <Line k="Fajr angle" v={`${e.fajrAngle}° below the horizon`} />
          <Line k="Isha" v={e.ishaInterval > 0 ? `${e.ishaInterval} minutes after Maghrib` : `${e.ishaAngle}° below the horizon`} />
        </Block>

        <Block title="Asr — the madhab question">
          <Line k="School" v={e.madhab} />
          <Line k="Rule" v={e.shadowRatio} />
          <p className="text-[11px] text-muted mt-2 leading-relaxed">
            This is the only fiqh difference that changes a calculated time. Both positions are
            held by recognised scholars; Sabeel shows whichever you chose and never overrides it.
          </p>
        </Block>

        <Block title="High latitude">
          <Line k="Rule" v={e.highLatitude} />
          <Line k="Effect" v={e.highLatitudeNote} />
          <p className="text-[11px] text-muted mt-2 leading-relaxed">
            Above roughly 48° the sun may never reach the required angle. This rule decides what
            Fajr and Isha mean on those nights.
          </p>
        </Block>

        {e.adjustments.length > 0 && (
          <Block title="Your manual offsets">
            {e.adjustments.map(([k, v]) => <Line key={k} k={k} v={`${v > 0 ? '+' : ''}${v} min`} />)}
          </Block>
        )}

        <Button to="/settings" variant="soft" size="lg" onClick={onClose}>
          Change any of this in Settings
        </Button>
      </div>
    </Sheet>
  )
}

function Block({ title, children }) {
  return (
    <div className="bg-bg border border-line rounded-2xl p-4">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted mb-2.5">{title}</h4>
      {children}
    </div>
  )
}

function Line({ k, v }) {
  return (
    <div className="flex gap-3 py-1 text-sm">
      <span className="text-muted capitalize shrink-0 w-28">{k}</span>
      <span className="flex-1 text-right">{v}</span>
    </div>
  )
}
