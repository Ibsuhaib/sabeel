import { useEffect, useState } from 'react'
import { useSettings } from '../lib/settings.jsx'
import { qiblaBearing } from '../lib/prayer.js'
import { Screen, Header, Card, Button, Empty } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'

export default function Qibla() {
  const { settings } = useSettings()
  const [heading, setHeading] = useState(null)
  const [status, setStatus] = useState('idle') // idle | live | denied | unsupported
  const bearing = qiblaBearing(settings)

  useEffect(() => {
    if (status !== 'live') return
    function onOrient(e) {
      // iOS exposes a true-north heading directly. Elsewhere alpha is relative to
      // magnetic north, which is close enough for facing a direction by hand.
      const h = e.webkitCompassHeading ?? (e.absolute && e.alpha != null ? 360 - e.alpha : null)
      if (h != null && !Number.isNaN(h)) setHeading(h)
    }
    window.addEventListener('deviceorientationabsolute', onOrient, true)
    window.addEventListener('deviceorientation', onOrient, true)
    return () => {
      window.removeEventListener('deviceorientationabsolute', onOrient, true)
      window.removeEventListener('deviceorientation', onOrient, true)
    }
  }, [status])

  async function enable() {
    const D = window.DeviceOrientationEvent
    if (!D) { setStatus('unsupported'); return }
    if (typeof D.requestPermission === 'function') {
      try {
        const res = await D.requestPermission()
        setStatus(res === 'granted' ? 'live' : 'denied')
      } catch { setStatus('denied') }
    } else {
      setStatus('live')
    }
  }

  if (!settings.location) {
    return (
      <Screen>
        <Header title="Qibla" back />
        <Empty icon="location" title="No location set" body="The qibla direction is calculated from your coordinates." action={<Button to="/settings">Set location</Button>} />
      </Screen>
    )
  }

  // Rotate the dial opposite to the device heading so the needle stays on the Kaaba.
  const dial = heading == null ? 0 : -heading
  const needle = bearing

  return (
    <Screen>
      <Header title="Qibla" subtitle={settings.location.label} back />

      <div className="px-4 pt-8">
        <div className="relative aspect-square max-w-xs mx-auto">
          <div
            className="absolute inset-0 rounded-full border border-line bg-surf transition-transform duration-200"
            style={{ transform: `rotate(${dial}deg)` }}
          >
            {['N', 'E', 'S', 'W'].map((d, i) => (
              <span
                key={d}
                className={`absolute left-1/2 -translate-x-1/2 text-xs font-semibold ${d === 'N' ? 'text-red-400' : 'text-muted'}`}
                style={{ top: 10, transformOrigin: '50% calc(50vw)', transform: `rotate(${i * 90}deg) translateY(0)` }}
              >{d}</span>
            ))}
            {Array.from({ length: 72 }, (_, i) => (
              <span
                key={i}
                className="absolute left-1/2 top-0 origin-bottom"
                style={{ height: '50%', transform: `translateX(-50%) rotate(${i * 5}deg)` }}
              >
                <span className={`block mx-auto ${i % 6 === 0 ? 'h-3 w-px bg-line' : 'h-1.5 w-px bg-line/50'}`} />
              </span>
            ))}

            <span
              className="absolute left-1/2 top-0 origin-bottom flex flex-col items-center"
              style={{ height: '50%', transform: `translateX(-50%) rotate(${needle}deg)` }}
            >
              <span className="w-9 h-9 rounded-lg bg-brand text-bg grid place-items-center -mt-1 shadow-lg">
                <Icon name="compass" size={18} />
              </span>
              <span className="flex-1 w-0.5 bg-brand/70" />
            </span>
          </div>

          <div className="absolute inset-0 grid place-items-center pointer-events-none">
            <div className="w-3 h-3 rounded-full bg-ink/30" />
          </div>
        </div>

        <div className="text-center mt-6">
          <div className="text-3xl font-semibold tabular-nums">{bearing.toFixed(1)}°</div>
          <div className="text-xs text-muted mt-1">from true north, toward the Kaaba</div>
        </div>

        <div className="mt-6">
          {status === 'live' && heading != null ? (
            <Card className="px-4 py-3 text-center">
              <p className="text-xs text-muted">
                Compass live · device heading <span className="tabular-nums">{heading.toFixed(0)}°</span>
              </p>
              <p className="text-[11px] text-muted/70 mt-1">Hold the phone flat and turn until the marker points up.</p>
            </Card>
          ) : status === 'live' ? (
            <Card className="px-4 py-3 text-center">
              <p className="text-xs text-muted">Waiting for compass data. If nothing happens, this device has no magnetometer.</p>
            </Card>
          ) : (
            <div>
              <Button size="lg" onClick={enable}>
                <Icon name="compass" size={16} />Use the compass
              </Button>
              {status === 'denied' && <p className="text-xs text-amber-500 mt-2 text-center">Compass permission was denied.</p>}
              {status === 'unsupported' && <p className="text-xs text-amber-500 mt-2 text-center">This device has no orientation sensor.</p>}
            </div>
          )}
        </div>

        <Card className="mt-4 px-4 py-3">
          <p className="text-xs text-muted leading-relaxed">
            <Icon name="info" size={13} className="inline mr-1.5 -mt-0.5" />
            Without the compass, use the sun: face {bearing.toFixed(0)}° measured clockwise from
            true north. A phone compass is affected by metal and magnets — for a masjid or a
            permanent prayer spot, confirm with a second source.
          </p>
        </Card>
      </div>
    </Screen>
  )
}
