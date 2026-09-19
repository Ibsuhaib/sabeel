import { isNative } from './native.js'

// The Location switch: whether it is on, and how to get to it.
//
// Kept in its own file, away from locate.js, on purpose. locate.js is the code
// that actually fetches a position, it is byte-identical to the build that was
// working, and nothing here is allowed anywhere near it. Three regressions came
// from native code being put in front of navigator.geolocation; this sits beside
// it and is only ever consulted after a fix has already failed.

let plugin = null

async function settings() {
  if (plugin !== null) return plugin
  if (!(await isNative())) { plugin = false; return false }
  try {
    const { registerPlugin } = await import('@capacitor/core')
    plugin = registerPlugin('LocationSettings')
  } catch {
    plugin = false
  }
  return plugin
}

/**
 * Is the device's Location switch on?
 * @returns true, false, or null when there is no way to ask — a browser, or a
 *          build without the plugin. Null means "do not claim either way".
 */
export async function locationSwitchOn() {
  const p = await settings()
  if (!p) return null
  try {
    const r = await p.isEnabled()
    return Boolean(r?.enabled)
  } catch {
    return null
  }
}

/** Open Android's location settings. False when there is nothing to open. */
export async function openLocationSettings() {
  const p = await settings()
  if (!p) return false
  try { await p.open(); return true } catch { return false }
}
