import { useEffect, useRef } from 'react'
import { addSeconds, TICK_MS } from './reading.js'

// Banks reading time while a reader screen is mounted and the app is actually
// in front of the user. Ticks are small and only counted when the previous tick
// was recent, so a phone that sleeps with the reader open contributes nothing.
export function useReadingTimer(active = true) {
  const last = useRef(0)
  const pending = useRef(0)

  useEffect(() => {
    if (!active) return

    const flush = () => {
      const secs = pending.current
      pending.current = 0
      if (secs >= 1) addSeconds(secs)
    }

    const tick = () => {
      if (document.visibilityState !== 'visible') { last.current = 0; return }
      const now = Date.now()
      if (last.current && now - last.current <= TICK_MS * 4) {
        pending.current += (now - last.current) / 1000
      }
      last.current = now
      // Write every minute rather than every tick — IndexedDB writes are not
      // free and nobody needs second-by-second durability here.
      if (pending.current >= 60) flush()
    }

    last.current = Date.now()
    const id = setInterval(tick, TICK_MS)

    const onVisibility = () => {
      if (document.visibilityState === 'visible') last.current = Date.now()
      else { flush(); last.current = 0 }
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', flush)

    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [active])
}
