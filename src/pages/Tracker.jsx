import { useEffect, useMemo, useState } from 'react'
import { store } from '../lib/store.js'
import { FARD } from '../lib/prayer.js'
import { dateKey } from '../lib/format.js'
import { Screen, Header, Card, Section, Loading } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export default function Tracker() {
  const [log, setLog] = useState(null)
  const [month, setMonth] = useState(() => { const d = new Date(); d.setDate(1); return d })

  useEffect(() => { store.prayerLog().then(setLog) }, [])
  if (!log) return <Loading />

  return (
    <Screen>
      <Header title="Prayer tracker" subtitle="Stored on this device only" back />
      <Heatmap log={log} month={month} onMonth={setMonth} />
      <Streaks log={log} />
      <Qada log={log} />
      <p className="text-[11px] text-muted/70 text-center px-10 mt-8 leading-relaxed">
        A record is between you and Allah. Nothing here is uploaded, scored, or shared.
      </p>
    </Screen>
  )
}

function dayScore(entry) {
  if (!entry) return 0
  return FARD.filter(p => entry[p.id] === 'jamaah' || entry[p.id] === 'alone').length
}

function Heatmap({ log, month, onMonth }) {
  const year = month.getFullYear()
  const m = month.getMonth()
  const first = new Date(year, m, 1)
  const days = new Date(year, m + 1, 0).getDate()
  const pad = first.getDay()
  const today = dateKey()

  const cells = [
    ...Array.from({ length: pad }, () => null),
    ...Array.from({ length: days }, (_, i) => new Date(year, m, i + 1))
  ]

  return (
    <Section title={month.toLocaleDateString([], { month: 'long', year: 'numeric' })} action={
      <div className="flex gap-1">
        <button onClick={() => onMonth(new Date(year, m - 1, 1))} className="tap p-1 text-muted"><Icon name="back" size={16} /></button>
        <button onClick={() => onMonth(new Date(year, m + 1, 1))} className="tap p-1 text-muted"><Icon name="forward" size={16} /></button>
      </div>
    }>
      <Card className="mx-4 p-4">
        <div className="grid grid-cols-7 gap-1.5 mb-2">
          {WEEKDAYS.map((d, i) => <div key={i} className="text-center text-[10px] text-muted">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((d, i) => {
            if (!d) return <div key={i} />
            const k = dateKey(d)
            const score = dayScore(log[k])
            const isToday = k === today
            const future = d > new Date()
            return (
              <div
                key={i}
                title={`${k} — ${score}/5 prayers`}
                className={`aspect-square rounded-md grid place-items-center text-[10px] tabular-nums transition-colors ${
                  future ? 'bg-bg text-muted/30'
                    : score === 5 ? 'bg-brand text-bg font-semibold'
                    : score > 0 ? 'bg-brand/25 text-ink'
                    : 'bg-bg text-muted/50'
                } ${isToday ? 'ring-1 ring-gold' : ''}`}
              >
                {d.getDate()}
              </div>
            )
          })}
        </div>
        <div className="flex items-center justify-center gap-3 mt-4 text-[10px] text-muted">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-bg border border-line" />none</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-brand/25" />partial</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-brand" />all five</span>
        </div>
      </Card>
    </Section>
  )
}

function Streaks({ log }) {
  const { current, best, jamaah, total } = useMemo(() => {
    let current = 0, best = 0, run = 0, jamaah = 0, total = 0
    const d = new Date()
    // Walk backwards from today for the current streak.
    for (let i = 0; i < 400; i++) {
      const day = new Date(d.getTime() - i * 86400000)
      const s = dayScore(log[dateKey(day)])
      if (i === 0 && s < 5) continue          // today may still be in progress
      if (s === 5) current++
      else break
    }
    // Scan every recorded day for the best streak and totals.
    const keys = Object.keys(log).sort()
    let prev = null
    for (const k of keys) {
      const s = dayScore(log[k])
      total += s
      jamaah += FARD.filter(p => log[k][p.id] === 'jamaah').length
      const isNext = prev && (new Date(k) - new Date(prev)) === 86400000
      run = s === 5 ? (isNext ? run + 1 : 1) : 0
      best = Math.max(best, run)
      prev = k
    }
    return { current, best, jamaah, total }
  }, [log])

  return (
    <Section title="Your record">
      <div className="grid grid-cols-2 gap-2 px-4">
        <StatCard label="Current streak" value={current} unit={current === 1 ? 'day' : 'days'} />
        <StatCard label="Best streak" value={best} unit={best === 1 ? 'day' : 'days'} />
        <StatCard label="Prayers logged" value={total} unit="total" />
        <StatCard label="In jamaah" value={jamaah} unit="prayers" />
      </div>
    </Section>
  )
}

function StatCard({ label, value, unit }) {
  return (
    <Card className="p-4">
      <div className="text-2xl font-semibold tabular-nums text-brand">{value}</div>
      <div className="text-xs text-muted mt-0.5">{label}</div>
      <div className="text-[10px] text-muted/60">{unit}</div>
    </Card>
  )
}

function Qada({ log }) {
  const counts = useMemo(() => {
    const out = {}
    for (const p of FARD) out[p.id] = 0
    for (const day of Object.values(log)) {
      for (const p of FARD) if (day[p.id] === 'qada') out[p.id]++
    }
    return out
  }, [log])

  const total = Object.values(counts).reduce((a, b) => a + b, 0)

  return (
    <Section title="Missed prayers marked qada">
      <Card className="mx-4 p-4">
        {total === 0 ? (
          <p className="text-sm text-muted">Nothing marked as qada.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {FARD.map(p => counts[p.id] > 0 && (
                <span key={p.id} className="px-2.5 py-1 rounded-lg bg-bg border border-line text-xs">
                  <span className="text-muted">{p.label} </span>
                  <strong className="tabular-nums">{counts[p.id]}</strong>
                </span>
              ))}
            </div>
            <p className="text-[11px] text-muted mt-3 leading-relaxed">
              {total} prayer{total === 1 ? '' : 's'} marked for making up. Mark one as prayed once
              you have made it up.
            </p>
          </>
        )}
      </Card>
    </Section>
  )
}
