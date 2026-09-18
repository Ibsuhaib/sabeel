import { useEffect, useState } from 'react'
import { isNative } from './native.js'

// Whether this is the installed Android app rather than a page in a browser.
//
// It exists because a good deal of the app's writing was originally addressed to
// someone in a browser tab — audio the browser blocked, storage the browser may
// clear, an invitation to install to the home screen — and every one of those
// sentences is wrong inside the APK, where there is no tab, the storage is the
// app's own, and it is already installed.
//
// Answers null until the check resolves, which takes a tick, so a caller can
// render nothing rather than flash the wrong sentence and then correct itself.
export function useIsNative() {
  const [native, setNative] = useState(null)
  useEffect(() => {
    let alive = true
    isNative().then(v => { if (alive) setNative(v) }).catch(() => { if (alive) setNative(false) })
    return () => { alive = false }
  }, [])
  return native
}
