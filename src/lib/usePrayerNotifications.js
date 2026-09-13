import { useEffect, useRef, useState } from 'react'
import { schedule, catchUp, clearTimers, cancelAll, effectivePermission } from './notifications.js'
import { playFor, stopSound } from './sounds.js'
import { adhanCatalogue } from './data.js'

// Lives at the app level so prayer times are armed for the whole session, not
// only while the Prayer screen happens to be open.
export function usePrayerNotifications(settings) {
  const adhanFile = useRef(null)
  const fajrFile = useRef(null)
  const [granted, setGranted] = useState(false)
  useEffect(() => { effectivePermission().then(p => setGranted(p === 'granted')) }, [settings.notifications?.enabled])
  const enabled = !!settings.notifications?.enabled && granted && !!settings.location

  useEffect(() => {
    if (!enabled) return
    adhanCatalogue().then(c => {
      const byId = id => c?.adhans?.find(a => a.id === id)?.file
      const first = c?.adhans?.[0]?.file || null
      adhanFile.current = byId(settings.notifications?.adhanId) || first
      fajrFile.current = byId(settings.notifications?.fajrAdhanId) || adhanFile.current
    }).catch(() => {})
  }, [enabled])

  useEffect(() => {
    if (!enabled) { cancelAll(); return }

    // Which prayer fired decides which adhan plays.
    const onFire = (item) => {
      playFor(settings, { adhanFile: adhanFile.current, fajrFile: fajrFile.current, prayer: item?.prayer })
    }

    // Anything that came due while the app was closed, then arm what is next.
    catchUp(settings, { onFire })
    schedule(settings, { onFire })

    // Timers do not survive a suspended tab reliably, so re-arm whenever the
    // app comes back to the foreground.
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      catchUp(settings, { onFire })
      schedule(settings, { onFire })
    }
    document.addEventListener('visibilitychange', onVisible)

    // Tapping the notification, or swiping it away, stops the adhan — the sound
    // is a call, and once it has been answered it should not keep going.
    const onMessage = e => {
      if (e.data?.type === 'notification-opened' || e.data?.type === 'notification-closed') stopSound()
    }
    navigator.serviceWorker?.addEventListener?.('message', onMessage)

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      navigator.serviceWorker?.removeEventListener?.('message', onMessage)
      clearTimers()
    }
  }, [
    enabled,
    settings.location?.lat,
    settings.location?.lng,
    settings.method,
    settings.madhab,
    settings.highLatitudeRule,
    settings.notifications?.sound,
    settings.notifications?.reminderMinutes,
    settings.notifications?.notifySunrise,
    JSON.stringify(settings.notifications?.perPrayer || {}),
    JSON.stringify(settings.adjustments || {})
  ])
}
