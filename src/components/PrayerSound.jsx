import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSettings, prayerSound } from '../lib/settings.jsx'
import { playBeep, vibrate } from '../lib/sounds.js'
import { Sheet } from './ui.jsx'
import Icon from './Icon.jsx'

// How each prayer announces itself, set from the prayer list itself rather than
// from a settings screen two taps away — the place you are already looking when
// you decide that Fajr should call and Dhuhr should only chime.

export const MODES = [
  { id: 'adhan', icon: 'bell', label: 'Adhan', note: 'The full call to prayer' },
  { id: 'beep', icon: 'chime', label: 'Beep', note: 'A short chime' },
  { id: 'silent', icon: 'mute', label: 'Silent', note: 'Notification only, no sound' },
  { id: 'off', icon: 'bellOff', label: 'Off', note: 'No notification for this prayer' }
]

const MODE = Object.fromEntries(MODES.map(m => [m.id, m]))

/** The compact control that sits beside a prayer time. */
export default function PrayerSound({ prayer, label, disabled }) {
  const { settings, set } = useSettings()
  const [open, setOpen] = useState(false)

  const raw = settings.notifications?.perPrayer?.[prayer]
  const mode = MODE[raw] ? raw : 'adhan'
  const effective = prayerSound(settings, prayer)   // 'off' when the master switch is off
  const m = MODE[mode]

  function choose(id) {
    set({
      notifications: {
        ...settings.notifications,
        perPrayer: { ...(settings.notifications?.perPrayer || {}), [prayer]: id }
      }
    })
    setOpen(false)
    if (id === 'beep') playBeep({ repeats: 1 })
    else if (id === 'silent') vibrate([20])
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={disabled}
        aria-label={`${label} notification: ${m.label}`}
        className={`tap shrink-0 w-9 h-9 grid place-items-center rounded-xl border transition-colors ${
          effective === 'off'
            ? 'border-line text-muted/50'
            : effective === 'adhan'
              ? 'border-brand/40 bg-brand/10 text-brand'
              : 'border-gold/40 bg-gold/10 text-gold'
        } disabled:opacity-40`}
      >
        <Icon name={m.icon} size={17} />
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title={`${label} notification`}>
        <div className="p-4">
          {!settings.notifications?.enabled && (
            <div className="mb-3 rounded-xl border border-gold/30 bg-gold/[0.07] px-3.5 py-2.5">
              <p className="text-[11px] text-muted leading-relaxed">
                Prayer notifications are switched off altogether, so nothing will sound yet.
                <Link to="/notifications" onClick={() => setOpen(false)} className="text-gold ml-1">
                  Turn them on
                </Link>
              </p>
            </div>
          )}

          <div className="space-y-2">
            {MODES.map(o => (
              <button
                key={o.id}
                onClick={() => choose(o.id)}
                className={`tap w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl border text-left transition-colors ${
                  mode === o.id ? 'border-brand bg-brand/10' : 'border-line bg-surf'
                }`}
              >
                <span className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${
                  mode === o.id ? 'bg-brand/15 text-brand' : 'bg-bg text-muted'
                }`}>
                  <Icon name={o.icon} size={17} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm ${mode === o.id ? 'text-brand font-medium' : ''}`}>{o.label}</span>
                  <span className="block text-[11px] text-muted mt-0.5">{o.note}</span>
                </span>
                {mode === o.id && <Icon name="check" size={16} className="text-brand shrink-0" />}
              </button>
            ))}
          </div>

          {prayer === 'fajr' && (
            <p className="text-[11px] text-muted/80 mt-3 leading-relaxed px-1">
              <Icon name="info" size={12} className="inline mr-1.5 -mt-0.5" />
              Fajr uses its own recording, because its adhan carries the tathwīb — the line
              that prayer is better than sleep. Choose it under Adhan sounds.
            </p>
          )}

          <Link
            to="/notifications" onClick={() => setOpen(false)}
            className="tap flex items-center gap-2 mt-3 px-3.5 py-3 rounded-2xl border border-line bg-surf text-sm"
          >
            <Icon name="settings" size={16} className="text-muted" />
            <span className="flex-1">All notification settings</span>
            <Icon name="forward" size={15} className="text-muted" />
          </Link>
        </div>
      </Sheet>
    </>
  )
}
