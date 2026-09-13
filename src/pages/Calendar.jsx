import { useState } from 'react'
import { useSettings } from '../lib/settings.jsx'
import { hijri, upcomingEvents, isWhiteDay, HIJRI_MONTHS } from '../lib/hijri.js'
import { dateKey } from '../lib/format.js'
import { Screen, Header, Card, Section, IconButton } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function Calendar() {
  const { settings } = useSettings()
  const [month, setMonth] = useState(() => { const d = new Date(); d.setDate(1); return d })
  const off = settings.hijriOffset

  const year = month.getFullYear()
  const m = month.getMonth()
  const days = new Date(year, m + 1, 0).getDate()
  const pad = new Date(year, m, 1).getDay()
  const today = dateKey()
  const events = upcomingEvents(off, 8)

  const cells = [
    ...Array.from({ length: pad }, () => null),
    ...Array.from({ length: days }, (_, i) => new Date(year, m, i + 1))
  ]

  const firstH = hijri(new Date(year, m, 1), off)
  const lastH = hijri(new Date(year, m, days), off)

  return (
    <Screen>
      <Header
        title="Calendar"
        subtitle={hijri(new Date(), off).formatted}
        back
      />

      <div className="flex items-center justify-between px-4 pt-3">
        <IconButton name="back" label="Previous month" onClick={() => setMonth(new Date(year, m - 1, 1))} />
        <div className="text-center">
          <div className="text-sm font-medium">{month.toLocaleDateString([], { month: 'long', year: 'numeric' })}</div>
          <div className="text-[11px] text-muted">
            {firstH.monthName}{firstH.monthName !== lastH.monthName ? ` – ${lastH.monthName}` : ''} {lastH.year} AH
          </div>
        </div>
        <IconButton name="forward" label="Next month" onClick={() => setMonth(new Date(year, m + 1, 1))} />
      </div>

      <div className="px-4 mt-3">
        <Card className="p-3">
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map(d => <div key={d} className="text-center text-[10px] text-muted py-1">{d.slice(0, 1)}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (!d) return <div key={i} />
              const h = hijri(d, off)
              const white = isWhiteDay(d, off)
              const friday = d.getDay() === 5
              const mondayOrThursday = d.getDay() === 1 || d.getDay() === 4
              const isToday = dateKey(d) === today
              const ev = events.find(e => dateKey(e.date) === dateKey(d))
              return (
                <div
                  key={i}
                  className={`aspect-square rounded-lg p-1 flex flex-col items-center justify-center relative ${
                    isToday ? 'bg-brand text-bg' : ev ? 'bg-gold/15' : white ? 'bg-brand/10' : ''
                  }`}
                  title={ev ? ev.name : white ? 'Ayyam al-Bid — white days' : mondayOrThursday ? 'Monday/Thursday fast' : ''}
                >
                  <span className={`text-[11px] tabular-nums leading-none ${friday && !isToday ? 'text-brand font-semibold' : ''}`}>
                    {d.getDate()}
                  </span>
                  <span className={`text-[9px] tabular-nums leading-none mt-0.5 ${isToday ? 'opacity-80' : 'text-muted'}`}>
                    {h.day}
                  </span>
                  {ev && <span className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-gold" />}
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 px-4 mt-3 text-[10px] text-muted">
        <Legend swatch="bg-brand" label="Today" />
        <Legend swatch="bg-brand/25" label="Ayyam al-Bid (13–15)" />
        <Legend swatch="bg-gold/30" label="Islamic date" />
        <span className="text-brand">Fridays in green</span>
      </div>

      <Section title="Recommended fasts">
        <div className="px-4 space-y-2">
          <Card className="px-4 py-3">
            <p className="text-sm font-medium">Monday and Thursday</p>
            <p className="text-[11px] text-muted mt-1 leading-relaxed">
              The Prophet ﷺ used to fast on these days. Deeds are presented to Allah on them.
              <span className="block mt-1 opacity-70">Sunan at-Tirmidhi 747 · graded Hasan</span>
            </p>
          </Card>
          <Card className="px-4 py-3">
            <p className="text-sm font-medium">Ayyam al-Bid — the white days</p>
            <p className="text-[11px] text-muted mt-1 leading-relaxed">
              The 13th, 14th and 15th of each Hijri month. Marked in green on the calendar above.
              <span className="block mt-1 opacity-70">Sunan an-Nasa'i 2420 · graded Sahih</span>
            </p>
          </Card>
        </div>
      </Section>

      <Section title="Upcoming dates">
        <div className="px-4 space-y-2">
          {events.map(e => (
            <Card key={`${e.name}-${e.inDays}`} className="px-4 py-3 flex items-start gap-3">
              <Icon name="star" size={16} className="text-gold shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{e.name}</p>
                <p className="text-[11px] text-muted mt-0.5">
                  {e.date.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                  {' · '}{e.hijri.day} {e.hijri.monthName}
                  {' · '}{e.inDays === 0 ? 'today' : e.inDays === 1 ? 'tomorrow' : `in ${e.inDays} days`}
                </p>
                {e.note && <p className="text-[11px] text-muted/80 mt-1 leading-relaxed">{e.note}</p>}
              </div>
            </Card>
          ))}
        </div>
      </Section>

      <p className="text-[11px] text-muted/70 text-center px-8 mt-6 leading-relaxed">
        Hijri dates use the Umm al-Qura calculated calendar. Actual moonsighting varies by
        country — adjust the offset in Settings to match your local announcement.
      </p>
    </Screen>
  )
}

function Legend({ swatch, label }) {
  return <span className="flex items-center gap-1"><span className={`w-2.5 h-2.5 rounded ${swatch}`} />{label}</span>
}
