import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSettings } from '../lib/settings.jsx'
import { timesFor, nextPrayer, explain, duhaWindow, PRAYERS, FARD } from '../lib/prayer.js'
import { fmtTime, fmtCountdown, dateKey } from '../lib/format.js'
import { hijri } from '../lib/hijri.js'
import { store } from '../lib/store.js'
import { Screen, Header, Card, Section, Sheet, IconButton, Button, Empty } from '../components/ui.jsx'
import LocationPrompt from '../components/LocationPrompt.jsx'
import PrayerSound from '../components/PrayerSound.jsx'
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
        actions={
          <>
            <IconButton name="bell" label="Prayer notifications" to="/notifications" />
            <IconButton name="compass" label="Qibla" to="/qibla" />
          </>
        }
      />

      <LocationPrompt what="Prayer times" />

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
        <NextPrayerCard next={next} now={now} previous={previousTime(t, next)} />
      )}

      <div className="px-4 mt-4 space-y-2">
        {PRAYERS.map(p => (
          <PrayerRow
            key={p.id} p={p}
            time={t[p.id]}
            active={isToday && next?.id === p.id}
            passed={isToday && t[p.id] < now}
            state={todayLog[p.id]}
            onMark={mark}
            showTracker={isToday || offset < 0}
          />
        ))}
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

// The time the current window opened, so the hero can show how far through it we
// are. Without it the countdown is a number with no sense of scale.
function previousTime(t, next) {
  const order = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha']
  const i = order.indexOf(next.id)
  if (i > 0) return t[order[i - 1]]
  return t.isha instanceof Date ? new Date(t.isha.getTime() - 86400000) : null
}

// One glyph per prayer, all different. Fajr and Sunrise sharing a sunrise mark
// made the two rows read as duplicates of each other at a glance.
const GLYPH = {
  fajr: 'dawn', sunrise: 'sunrise', dhuhr: 'sun',
  asr: 'sunLow', maghrib: 'sunset', isha: 'moon'
}

function NextPrayerCard({ next, now, previous }) {
  const total = previous ? next.time - previous : null
  const done = total ? Math.min(1, Math.max(0, (now - previous) / total)) : 0

  return (
    <div className="px-4 mt-4">
      <div className="relative overflow-hidden rounded-3xl border border-brand/30 bg-gradient-to-b from-brand/[0.13] to-surf px-5 pt-5 pb-4">
        <div className="flex items-start gap-3">
          <span className="w-11 h-11 rounded-2xl bg-brand/15 text-brand grid place-items-center shrink-0">
            <Icon name={GLYPH[next.id] || 'prayer'} size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-wider text-brand/80">
              Next{next.isNextDay ? ' · tomorrow' : ''}
            </p>
            <p className="text-lg font-semibold leading-tight mt-0.5">{next.label}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[11px] text-muted">at</p>
            <p className="text-[15px] font-medium tabular-nums">{fmtTime(next.time)}</p>
          </div>
        </div>

        <p className="text-[2.6rem] leading-none font-semibold text-brand tabular-nums mt-4 text-center">
          {fmtCountdown(next.time - now)}
        </p>

        {total > 0 && (
          <div className="mt-4">
            <div className="h-1.5 rounded-full bg-bg overflow-hidden">
              <div
                className="h-full rounded-full bg-brand/70 transition-[width] duration-1000 ease-linear"
                style={{ width: `${(done * 100).toFixed(2)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted mt-1.5 tabular-nums">
              <span>{fmtTime(previous)}</span>
              <span>{fmtTime(next.time)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const TRACK = [['jamaah', 'In jamaah'], ['alone', 'Prayed'], ['qada', 'Qada']]

function PrayerRow({ p, time, active, passed, state, onMark, showTracker }) {
  return (
    <div className={`rounded-2xl border transition-colors ${
      active ? 'border-brand/50 bg-brand/[0.06]' : 'border-line bg-surf'
    }`}>
      <div className="flex items-center gap-3 px-3.5 py-3">
        <span className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${
          active ? 'bg-brand/15 text-brand' : passed ? 'bg-bg text-muted/50' : 'bg-bg text-muted'
        }`}>
          <Icon name={GLYPH[p.id] || 'prayer'} size={17} />
        </span>

        <span className="min-w-0 flex-1">
          <span className={`block text-[15px] leading-tight ${
            active ? 'text-brand font-medium' : passed ? 'text-muted' : ''
          }`}>{p.label}</span>
          {!p.isPrayer && <span className="block text-[10px] text-muted mt-0.5">Not a prayer — the Fajr window closes</span>}
          {p.isPrayer && state && (
            <span className="block text-[10px] text-brand/80 mt-0.5">
              {TRACK.find(([id]) => id === state)?.[1]}
            </span>
          )}
        </span>

        <span className={`tabular-nums text-[15px] shrink-0 ${
          active ? 'text-brand font-semibold' : passed ? 'text-muted/70' : 'text-muted'
        }`}>{fmtTime(time)}</span>

        {p.isPrayer
          ? <PrayerSound prayer={p.id} label={p.label} />
          : <span className="w-9 shrink-0" />}
      </div>

      {p.isPrayer && showTracker && (
        <div className="flex gap-1.5 px-3.5 pb-3">
          {TRACK.map(([id, label]) => (
            <button
              key={id} onClick={() => onMark(p.id, id)}
              className={`tap chip flex-1 py-1.5 rounded-lg text-[11px] border transition-colors ${
                state === id ? 'border-brand bg-brand/10 text-brand' : 'border-line text-muted'
              }`}
            >{label}</button>
          ))}
        </div>
      )}
    </div>
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

        {e.insidePolarCircle && (
          <Block title="Polar circle">
            <Line k="Rule" v={e.polarRule} />
            <Line k="Effect" v={e.polarNote} />
            <p className="text-[11px] text-amber-500 mt-2 leading-relaxed">
              You are inside the polar circle, where the sun can stay up or down for weeks and
              the usual signs disappear entirely. These times are a scholarly accommodation, not
              an observation. Follow your local masjid or scholar over this app.
            </p>
          </Block>
        )}

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
