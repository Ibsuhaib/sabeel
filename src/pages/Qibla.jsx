import { useEffect, useRef, useState } from 'react'
import { useSettings } from '../lib/settings.jsx'
import { qiblaBearing, kaabaDistanceKm } from '../lib/prayer.js'
import { useCompass, angleDelta, norm360 } from '../lib/compass.js'
import { modelInfo } from '../lib/geomag.js'
import { Screen, Header, Card, Button, Empty } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import LocationPrompt from '../components/LocationPrompt.jsx'

// How close counts as facing it. A prayer direction does not need to be exact to
// the degree — the Kaaba subtends far more than that from any distance — but the
// band has to be tight enough that "aligned" means something.
const ALIGNED = 5
const CLOSE = 15

export default function Qibla() {
  const { settings } = useSettings()
  const bearing = qiblaBearing(settings)
  const distance = kaabaDistanceKm(settings)

  // useCompass loads the magnetic model and reports the declination it applied,
  // so the figure shown here is the one actually used to correct the reading —
  // not a second, independently computed number that could disagree with it.
  const { heading, accuracy, reference, status, enable, declination: decl } =
    useCompass(settings.location)

  // Buzz once on arriving at the qibla, not continuously while held there.
  const wasAligned = useRef(false)
  const offset = heading == null ? null : angleDelta(heading, bearing)
  const aligned = offset != null && Math.abs(offset) <= ALIGNED

  useEffect(() => {
    if (aligned && !wasAligned.current && navigator.vibrate) navigator.vibrate([25, 40, 25])
    wasAligned.current = aligned
  }, [aligned])

  if (!settings.location) {
    return (
      <Screen>
        <Header title="Qibla" back />
        <Empty
          icon="location" title="No location set"
          body="The qibla direction is calculated from your coordinates."
          action={<Button to="/settings">Set location</Button>}
        />
      </Screen>
    )
  }

  // The dial turns opposite the device so north stays north; the arrow then sits
  // at the qibla bearing and the whole thing points where the phone points.
  const dial = heading == null ? 0 : -heading
  const live = status === 'live' && heading != null

  const ring = aligned ? 'rgb(var(--c-brand))' : Math.abs(offset ?? 180) <= CLOSE ? 'rgb(var(--c-gold))' : 'rgb(var(--c-line))'

  return (
    <Screen>
      <Header title="Qibla" subtitle={settings.location.label} back />

      <LocationPrompt what="The qibla direction" />

      <div className="px-4 pt-6">
        {/* ---------------------------------------------------------- dial */}
        <div className="relative aspect-square max-w-[19rem] mx-auto">
          <div
            className="absolute inset-0 rounded-full transition-colors duration-300"
            style={{ boxShadow: `0 0 0 2px ${ring}`, background: 'rgb(var(--c-surf))' }}
          />

          {/* rotating face */}
          <div
            className="absolute inset-0"
            style={{ transform: `rotate(${dial}deg)`, transition: live ? 'transform 120ms linear' : 'none' }}
          >
            {Array.from({ length: 72 }, (_, i) => {
              const major = i % 9 === 0
              return (
                <span key={i} className="absolute left-1/2 top-0 origin-bottom" style={{ height: '50%', transform: `translateX(-50%) rotate(${i * 5}deg)` }}>
                  <span className={`block mx-auto mt-2 ${major ? 'h-4 w-[2px] bg-muted' : i % 3 === 0 ? 'h-2.5 w-px bg-line' : 'h-1.5 w-px bg-line/60'}`} />
                </span>
              )
            })}

            {['N', 'E', 'S', 'W'].map((d, i) => (
              <span
                key={d} className="absolute left-1/2 top-0 origin-bottom"
                style={{ height: '50%', transform: `translateX(-50%) rotate(${i * 90}deg)` }}
              >
                <span
                  className={`block mt-7 text-[13px] font-bold ${d === 'N' ? 'text-red-400' : 'text-muted'}`}
                  style={{ transform: `rotate(${-i * 90 - dial}deg)` }}
                >{d}</span>
              </span>
            ))}

            {/* the arrow to the Kaaba */}
            <span
              className="absolute left-1/2 top-0 origin-bottom flex flex-col items-center"
              style={{ height: '50%', transform: `translateX(-50%) rotate(${bearing}deg)` }}
            >
              <svg width="44" height="54" viewBox="0 0 44 54" className="mt-1 drop-shadow-lg" aria-hidden="true">
                <path
                  d="M22 2 38 30 22 23 6 30Z"
                  fill={aligned ? 'rgb(var(--c-brand))' : 'rgb(var(--c-gold))'}
                  className="transition-[fill] duration-300"
                />
              </svg>
              <span
                className="flex-1 w-[3px] rounded-full transition-colors duration-300"
                style={{ background: aligned ? 'rgb(var(--c-brand) / 0.55)' : 'rgb(var(--c-gold) / 0.35)' }}
              />
            </span>
          </div>

          {/* fixed pointer showing where the phone is aimed */}
          <span className="absolute left-1/2 -translate-x-1/2 -top-1 text-muted" aria-hidden="true">
            <svg width="16" height="12" viewBox="0 0 16 12"><path d="M8 12 0 0h16Z" fill="currentColor" /></svg>
          </span>

          {/* centre readout */}
          <div className="absolute inset-0 grid place-items-center pointer-events-none">
            <div className="text-center">
              <div className="text-[2.1rem] leading-none font-semibold tabular-nums">{bearing.toFixed(0)}°</div>
              {live
                ? <div className={`text-[11px] mt-1 tabular-nums ${aligned ? 'text-brand' : 'text-muted'}`}>
                    {Math.abs(offset) < 1 ? 'on it' : `${Math.abs(offset).toFixed(0)}° ${offset > 0 ? 'right' : 'left'}`}
                  </div>
                : <div className="text-[11px] text-muted mt-1">from true north</div>}
            </div>
          </div>
        </div>

        {/* --------------------------------------------------------- status */}
        {live && (
          <div className={`mt-5 rounded-2xl px-4 py-3 text-center border transition-colors duration-300 ${
            aligned ? 'border-brand/60 bg-brand/10' : 'border-line bg-surf'
          }`}>
            {aligned ? (
              <p className="text-brand font-semibold flex items-center justify-center gap-2">
                <Icon name="check" size={17} /> You are facing the Qibla
              </p>
            ) : (
              <p className="text-sm text-muted">
                Turn {Math.abs(offset) > 90 ? 'around, then ' : ''}
                <span className="text-ink font-medium">{offset > 0 ? 'right' : 'left'}</span>
                {' '}until the arrow meets the marker.
              </p>
            )}
          </div>
        )}

        {!live && (
          <div className="mt-5">
            {status === 'waiting' ? (
              <Card className="px-4 py-3 text-center">
                <p className="text-xs text-muted">Waiting for the compass…</p>
              </Card>
            ) : (
              <>
                <Button size="lg" onClick={enable} className="w-full justify-center">
                  <Icon name="compass" size={16} />Use the compass
                </Button>
                {status === 'denied' && (
                  <p className="text-xs text-muted mt-2 text-center">
                    Compass access was refused. The bearing above is still correct — measure
                    {' '}{bearing.toFixed(0)}° clockwise from true north.
                  </p>
                )}
                {status === 'unsupported' && (
                  <p className="text-xs text-muted mt-2 text-center">
                    This device has no compass sensor. Measure {bearing.toFixed(0)}° clockwise
                    from true north instead.
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* ------------------------------------------------------- the facts */}
        <Card className="mt-4 divide-y divide-line">
          <Row label="Bearing" value={`${bearing.toFixed(1)}° from true north`} />
          <Row label="Distance to the Kaaba" value={`${distance < 100 ? distance.toFixed(1) : Math.round(distance).toLocaleString()} km`} />
          {decl != null && (
            <Row
              label="Magnetic declination"
              value={`${decl > 0 ? '+' : ''}${decl.toFixed(1)}° · ${modelInfo()?.name || 'WMM'}`}
            />
          )}
          {live && <Row label="Phone is pointing" value={`${norm360(heading).toFixed(0)}°`} />}
          {live && accuracy != null && <Row label="Compass accuracy" value={`±${accuracy.toFixed(0)}°`} />}
        </Card>

        {live && reference === 'magnetic' && (
          <p className="text-[11px] text-amber-500/90 mt-3 px-1 leading-relaxed">
            <Icon name="warn" size={12} className="inline mr-1.5 -mt-0.5" />
            Reading magnetic north without a declination correction — the magnetic model
            has not loaded, so the arrow may be off by the local declination.
          </p>
        )}

        <p className="text-[11px] text-muted/80 mt-3 px-1 leading-relaxed">
          <Icon name="info" size={12} className="inline mr-1.5 -mt-0.5" />
          The bearing is the great-circle direction to the Kaaba, and the compass reading is
          corrected from magnetic to true north for where you are. A phone magnetometer is
          still disturbed by metal, magnets and cases — move away from them, and sweep the
          phone in a figure of eight to recalibrate. For a masjid or a permanent prayer
          spot, confirm with a second source.
        </p>
      </div>
    </Screen>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-2.5">
      <span className="text-xs text-muted shrink-0">{label}</span>
      <span className="text-[13px] tabular-nums text-right">{value}</span>
    </div>
  )
}
