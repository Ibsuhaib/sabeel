import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSettings } from '../lib/settings.jsx'
import { locate, locationGranted, describeAccuracy } from '../lib/locate.js'
import Icon from './Icon.jsx'
import LocationError from './LocationError.jsx'

// Offers to swap a city-centre guess for an actual fix, on the two screens where
// the difference shows: prayer times and the qibla.
//
// It asks once and then stays out of the way — a dismissal is remembered, and it
// never appears at all once the app is working from a device fix. Nothing is
// requested until the button is pressed, so the system permission dialog only
// ever appears in response to a deliberate tap.
export default function LocationPrompt({ what = 'Prayer times' }) {
  const { settings, set } = useSettings()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem('sabeel.locationPrompt.dismissed') === '1' } catch { return false }
  })

  // If permission is already granted, upgrade quietly rather than asking again.
  useEffect(() => {
    if (!settings.location || settings.location.source === 'gps') return
    let alive = true
    locationGranted().then(ok => {
      if (!ok || !alive) return
      locate({ highAccuracy: false, timeout: 8000 })
        .then(loc => { if (alive) set({ location: { ...loc, label: settings.location.label } }) })
        .catch(() => {})
    })
    return () => { alive = false }
  }, [settings.location?.source])

  if (!settings.location || settings.location.source === 'gps' || dismissed) return null

  async function use() {
    setBusy(true); setError(null)
    try {
      set({ location: await locate() })
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }

  function dismiss() {
    setDismissed(true)
    try { localStorage.setItem('sabeel.locationPrompt.dismissed', '1') } catch {}
  }

  return (
    <div className="mx-4 mt-3 rounded-2xl border border-gold/30 bg-gold/[0.07] px-4 py-3.5">
      <div className="flex gap-2.5">
        <Icon name="location" size={16} className="text-gold shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium">Use your exact location?</p>
          <p className="text-[11px] text-muted mt-1 leading-relaxed">
            Working from {settings.location.label} — the middle of the city, which can be
            tens of kilometres from where you are standing. {what} would be more exact
            with a fix from the device.
          </p>

          <LocationError error={error} onRetry={use} />

          <div className="flex items-center gap-2 mt-2.5">
            <button
              onClick={use} disabled={busy}
              className="tap px-3 py-1.5 rounded-lg text-xs font-medium bg-gold/20 text-gold border border-gold/40 disabled:opacity-60"
            >
              {busy ? 'Locating…' : 'Use my location'}
            </button>
            <button onClick={dismiss} className="tap px-3 py-1.5 rounded-lg text-xs text-muted">
              Not now
            </button>
            <Link to="/settings" className="tap px-2 py-1.5 rounded-lg text-xs text-muted ml-auto">
              Change city
            </Link>
          </div>

          <p className="text-[10px] text-muted/70 mt-2 leading-relaxed">
            Your coordinates stay on this phone — there is no server to send them to.
          </p>
        </div>
      </div>
    </div>
  )
}

/** The one-line "where this came from" note, for screens that want it inline. */
export function LocationAccuracy({ className = '' }) {
  const { settings } = useSettings()
  const note = describeAccuracy(settings.location)
  if (!note) return null
  return <span className={`text-[11px] text-muted ${className}`}>{note}</span>
}
