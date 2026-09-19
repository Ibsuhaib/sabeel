import { isNative } from './native.js'

// The switches outside the app that decide whether a prayer notification is
// ever shown, and the one screen that fixes each.
//
// Getting the schedule right is the easy half. What actually decides whether
// someone is called to Fajr is a set of switches an app may not set for itself —
// notifications, exact alarms, battery optimisation, and on several brands a
// manufacturer's own autostart list that is not part of Android at all. Each
// discards the alarm silently. A prayer app is only as good as its worst device,
// so the app reads them all and offers the way to each.

let plugin = null

async function reliability() {
  if (plugin !== null) return plugin
  if (!(await isNative())) { plugin = false; return false }
  try {
    const { registerPlugin } = await import('@capacitor/core')
    plugin = registerPlugin('AlarmReliability')
  } catch {
    plugin = false
  }
  return plugin
}

/** Manufacturer, Android version, and whether battery and autostart are in the way. */
export async function deviceStatus() {
  const p = await reliability()
  if (!p) return null
  try { return await p.status() } catch { return null }
}

const opener = name => async () => {
  const p = await reliability()
  if (!p) return false
  try { await p[name](); return true } catch { return false }
}

export const openBatterySettings = opener('openBatterySettings')
export const openNotificationSettings = opener('openNotificationSettings')
export const openAutostartSettings = opener('openAutostartSettings')
