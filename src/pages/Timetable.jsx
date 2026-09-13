import { useMemo, useState } from 'react'
import { useSettings } from '../lib/settings.jsx'
import { monthTimetable, PRAYERS } from '../lib/prayer.js'
import { fmtTime, dateKey } from '../lib/format.js'
import { hijri } from '../lib/hijri.js'
import { Screen, Header, Card, Empty, Button, IconButton } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'

export default function Timetable() {
  const { settings } = useSettings()
  const [month, setMonth] = useState(() => { const d = new Date(); d.setDate(1); return d })

  const rows = useMemo(
    () => settings.location ? monthTimetable(settings, month.getFullYear(), month.getMonth()) : [],
    [settings, month]
  )

  if (!settings.location) {
    return (
      <Screen>
        <Header title="Timetable" back />
        <Empty icon="location" title="No location set" action={<Button to="/settings">Set location</Button>} />
      </Screen>
    )
  }

  const today = dateKey()

  return (
    <Screen>
      <Header
        title="Monthly timetable"
        subtitle={settings.location.label}
        back
        actions={<IconButton name="share" label="Print" onClick={() => window.print()} />}
      />

      <div className="flex items-center justify-between px-4 pt-3">
        <IconButton name="back" label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} />
        <span className="text-sm font-medium">{month.toLocaleDateString([], { month: 'long', year: 'numeric' })}</span>
        <IconButton name="forward" label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} />
      </div>

      <div className="px-4 mt-3">
        <Card className="overflow-x-auto">
          <table className="w-full text-xs tabular-nums">
            <thead>
              <tr className="text-muted border-b border-line">
                <th className="text-left font-medium px-3 py-2 sticky left-0 bg-surf">Date</th>
                {PRAYERS.map(p => <th key={p.id} className="font-medium px-2 py-2">{p.label.slice(0, 3)}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const isToday = dateKey(r.date) === today
                const h = hijri(r.date, settings.hijriOffset)
                const friday = r.date.getDay() === 5
                return (
                  <tr key={r.date.toISOString()} className={`border-b border-line/50 ${isToday ? 'bg-brand/10' : ''}`}>
                    <td className={`px-3 py-1.5 sticky left-0 ${isToday ? 'bg-brand/10' : 'bg-surf'}`}>
                      <span className={friday ? 'text-brand font-medium' : ''}>{r.date.getDate()}</span>
                      <span className="text-muted/60 ml-1.5">{h.day}</span>
                    </td>
                    {PRAYERS.map(p => (
                      <td key={p.id} className="px-2 py-1.5 text-center text-muted">{fmtTime(r[p.id])}</td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      </div>

      <p className="text-[11px] text-muted px-6 mt-4 leading-relaxed text-center">
        Gregorian date on the left, Hijri day beside it. Fridays are marked in green.
        Calculated with your current method and madhab — change either in Settings and this
        table updates.
      </p>
    </Screen>
  )
}
