import { useEffect, useState } from 'react'
import Icon from './Icon.jsx'
import { locationSwitchOn, openLocationSettings } from '../lib/locationSettings.js'

// What to show when a position could not be had — and what to do about it.
//
// The app was telling people to stand near a window when the Location switch was
// off. It could not tell the difference: Android reports the switch being off to
// the web API as a plain timeout, the same code a phone gives when it genuinely
// cannot see the sky, and the web API has no way to ask which it is.
//
// The app can ask now, but only here — after a fix has already failed. Nothing on
// this screen is involved in getting a position, so nothing on it can stop one
// being got. That separation is deliberate: it was putting native code in front
// of navigator.geolocation that broke location three times.
export default function LocationError({ error, onRetry }) {
  const [switchOn, setSwitchOn] = useState(null)   // null = could not ask (the web)
  const [opened, setOpened] = useState(false)

  useEffect(() => {
    if (!error) return
    let alive = true
    locationSwitchOn().then(v => { if (alive) setSwitchOn(v) })
    return () => { alive = false }
  }, [error])

  // Coming back from the settings screen is the moment to try again — otherwise
  // the app sits there showing the error you have just gone and fixed.
  useEffect(() => {
    if (!opened) return
    const onBack = () => {
      if (document.visibilityState !== 'visible') return
      setOpened(false)
      onRetry?.()
    }
    document.addEventListener('visibilitychange', onBack)
    return () => document.removeEventListener('visibilitychange', onBack)
  }, [opened, onRetry])

  if (!error) return null

  const off = switchOn === false
  // A refusal is the one failure the switch cannot explain, so the button would
  // only mislead there. Every other failure can be the switch, whatever code the
  // browser chose to report.
  const offerSettings = switchOn !== null && error.code !== 'denied'

  async function open() {
    if (await openLocationSettings()) setOpened(true)
  }

  return (
    <div className="mt-3">
      <p className="text-xs text-amber-500 flex gap-2 leading-relaxed">
        <Icon name="warn" size={14} className="shrink-0 mt-0.5" />
        <span>
          {off
            ? 'Location is switched off on this phone, so there is nothing for Sabeel to read. Turn it on and it will find you — it never leaves the device.'
            : error.message}
        </span>
      </p>

      {offerSettings && (
        <>
          <button
            onClick={open}
            className="tap mt-3 w-full py-2.5 rounded-xl border border-brand/40 bg-brand/10 text-brand text-[13px] font-medium flex items-center justify-center gap-2"
          >
            <Icon name="location" size={15} />
            {opened ? 'Waiting for you to turn it on…' : off ? 'Turn on location' : 'Check location settings'}
          </button>
          {!off && (
            <p className="text-[11px] text-muted/70 mt-2 leading-relaxed">
              If Location is already on, try again by a window — a first fix can take
              a while indoors — or pick your city from the list below.
            </p>
          )}
        </>
      )}
    </div>
  )
}
