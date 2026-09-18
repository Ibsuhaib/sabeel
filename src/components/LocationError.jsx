import { useEffect, useState } from 'react'
import Icon from './Icon.jsx'
import { openLocationSettings } from '../lib/native.js'
import { useIsNative } from '../lib/useNative.js'

// What to show when a position could not be had.
//
// The message alone was not enough. Told "Location is switched off on this
// phone", the next thing anyone wants is to switch it on, and describing where
// the tile lives is a poor substitute for going there — especially as every
// manufacturer puts it somewhere slightly different.
//
// So on Android the settings page is one tap away, and coming back from it
// retries by itself. Without that the app sits there still showing the error it
// just told you how to fix, which reads as though it did not work.
export default function LocationError({ error, onRetry }) {
  const [opened, setOpened] = useState(false)
  const [failed, setFailed] = useState(false)
  const native = useIsNative()

  // Only where there is a settings screen to open: a browser has no such button,
  // and offering one that does nothing is worse than not offering it.
  const isOff = error?.code === 'servicesOff'
  const canOpen = isOff && native === true && !failed

  // Returning from the settings screen is the moment to try again.
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

  async function open() {
    const ok = await openLocationSettings()
    if (ok) setOpened(true)
    else setFailed(true)
  }

  return (
    <div className="mt-3">
      <p className="text-xs text-amber-500 flex gap-2 leading-relaxed">
        <Icon name="warn" size={14} className="shrink-0 mt-0.5" />
        <span>{error.message}</span>
      </p>
      {canOpen && (
        <button
          onClick={open}
          className="tap mt-3 w-full py-2.5 rounded-xl border border-brand/40 bg-brand/10 text-brand text-[13px] font-medium flex items-center justify-center gap-2"
        >
          <Icon name="location" size={15} />
          {opened ? 'Waiting for you to turn it on…' : 'Open location settings'}
        </button>
      )}
    </div>
  )
}
