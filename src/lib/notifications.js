// Prayer-time notifications.
//
// What the web can and cannot do here, stated plainly because the UI repeats it
// to the user rather than pretending:
//
//   * While Sabeel is open — even as a background tab — timers fire exactly on
//     time and we can play the adhan or the chime ourselves.
//   * When Sabeel is fully closed, a PWA has no reliable alarm. The one real
//     mechanism is the Notification Triggers API (TimestampTrigger), which
//     schedules the notification with the operating system so it fires without
//     us. It is not available in every browser, so we feature-detect it and say
//     which one the user is getting.
//   * A closed-app notification uses the system's own sound. No web app can make
//     a closed PWA play a three-minute adhan — anything claiming otherwise is
//     either using a server push or is wrong.
//
// There is deliberately no push server: that would mean a backend, an account,
// and sending someone's prayer times off their phone.
import { timesFor, PRAYERS, FARD } from './prayer.js'
import { prayerSound } from './settings.jsx'
import { dateKey, fmtTime } from './format.js'
import { isNative, scheduleNative, cancelNative, requestNativePermission, nativePermission } from './native.js'

const FIRED_KEY = 'sabeel.notified.v1'
// How far ahead to work out prayer times.
//
// In the browser the page holds its own timers, so nothing survives the tab
// closing and a day is as far as it is worth looking. On Android the alarms
// belong to the operating system: it holds them through Doze, through the app
// being killed, and through a reboot. Arming only a day there meant the adhan
// stopped the moment someone went a day without opening Sabeel — which is
// exactly the person who needs to be called to prayer.
const HORIZON_HOURS = 24
const NATIVE_HORIZON_HOURS = 24 * 7

let timers = []
let installedFor = null

// Whether the *web* Notification API is present. This is not the same question
// as "can this app notify you": inside the Android WebView it is usually absent,
// while notifications work perfectly well through Capacitor's plugin. Anything
// user-facing must ask `available()` instead, or an installed app tells its user
// their browser cannot do notifications while it is busy scheduling them.
export const supported = () => typeof window !== 'undefined' && 'Notification' in window

/** Can this build notify at all — natively or through the browser? */
export async function available() {
  return (await isNative()) || supported()
}

export const permission = () => (supported() ? Notification.permission : 'unsupported')

// TimestampTrigger is the only way a closed PWA fires on time without a server.
export const hasTriggers = () =>
  typeof window !== 'undefined' && 'Notification' in window && 'showTrigger' in Notification.prototype

export async function requestPermission() {
  // Inside the APK the OS permission is the one that matters.
  if (await isNative()) return requestNativePermission()
  if (!supported()) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  try { return await Notification.requestPermission() } catch { return 'denied' }
}

// Async because the native check is; `permission()` stays sync for render paths.
export async function effectivePermission() {
  if (await isNative()) return nativePermission()
  return permission()
}

async function registration() {
  if (!('serviceWorker' in navigator)) return null
  try { return await navigator.serviceWorker.ready } catch { return null }
}

/* ------------------------------ fired ledger ----------------------------- */
// So a prayer is never announced twice, and so the catch-up on open knows what
// it already showed.

function ledger() {
  try { return JSON.parse(localStorage.getItem(FIRED_KEY) || '{}') } catch { return {} }
}

function remember(id) {
  const l = ledger()
  l[id] = Date.now()
  // Keep it small: drop anything older than three days.
  const cutoff = Date.now() - 3 * 86400000
  for (const [k, t] of Object.entries(l)) if (t < cutoff) delete l[k]
  try { localStorage.setItem(FIRED_KEY, JSON.stringify(l)) } catch { /* private mode */ }
  return l
}

const alreadyFired = id => Object.prototype.hasOwnProperty.call(ledger(), id)

/* ------------------------------- schedule -------------------------------- */

// Every prayer inside the horizon that the user has switched on, plus its
// optional "it starts soon" reminder.
export function upcoming(settings, from = new Date(), hours = HORIZON_HOURS) {
  const n = settings.notifications || {}
  if (!settings.location) return []

  const out = []
  // One day past the horizon, because a prayer that falls inside the window can
  // belong to the day after the last whole one it covers.
  const days = Math.ceil(hours / 24) + 1
  for (let dayOffset = 0; dayOffset < days; dayOffset++) {
    const day = new Date(from.getTime() + dayOffset * 86400000)
    const t = timesFor(settings, day)
    if (!t) continue
    const key = dateKey(day)

    for (const p of PRAYERS) {
      if (!p.isPrayer && !n.notifySunrise) continue
      // Each prayer carries its own sound mode, so the schedule records it on the
      // item — that is what lets one prayer sound the adhan while the next only
      // chimes, which a single global setting could never express.
      const sound = p.isPrayer ? prayerSound(settings, p.id) : 'silent'
      if (sound === 'off') continue

      const at = t[p.id]
      if (!(at instanceof Date) || Number.isNaN(at.getTime())) continue

      if (at > from && at - from < hours * 3600000) {
        out.push({ id: `${key}:${p.id}`, prayer: p.id, label: p.label, at, kind: 'adhan', sound })
      }

      const mins = Number(n.reminderMinutes) || 0
      if (mins > 0) {
        const early = new Date(at.getTime() - mins * 60000)
        if (early > from && early - from < hours * 3600000) {
          out.push({ id: `${key}:${p.id}:pre`, prayer: p.id, label: p.label, at: early, kind: 'reminder', minutes: mins, sound })
        }
      }
    }
  }
  return out.sort((a, b) => a.at - b.at)
}

function body(item, settings) {
  if (item.kind === 'reminder') {
    const prayerAt = new Date(item.at.getTime() + item.minutes * 60000)
    return `${item.label} is in ${item.minutes} minute${item.minutes === 1 ? '' : 's'} — ${fmtTime(prayerAt)}`
  }
  const place = settings.location?.label
  return place ? `It is time for ${item.label} in ${place}` : `It is time for ${item.label}`
}

async function show(item, settings) {
  const reg = await registration()
  const options = {
    body: body(item, settings),
    tag: item.id,
    // Keep it on screen until the user actually deals with it. Android keeps
    // notifications in the shade regardless; this is what makes desktop behave
    // the same way.
    requireInteraction: true,
    renotify: false,
    silent: item.sound === 'silent' && !settings.notifications?.systemSound,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    timestamp: item.at.getTime(),
    data: { url: '/#/prayer', prayer: item.prayer, kind: item.kind },
    actions: [{ action: 'open', title: 'Open Sabeel' }, { action: 'dismiss', title: 'Dismiss' }]
  }

  const title = item.kind === 'reminder' ? `${item.label} soon` : `${item.label} — ${fmtTime(item.at)}`

  try {
    if (reg) await reg.showNotification(title, options)
    else new Notification(title, options)
    return true
  } catch {
    return false
  }
}

// Hand the whole next day to the OS, so notifications fire with the app closed.
async function scheduleWithTriggers(items, settings) {
  const reg = await registration()
  if (!reg) return 0
  let armed = 0
  for (const item of items) {
    try {
      await reg.showNotification(
        item.kind === 'reminder' ? `${item.label} soon` : `${item.label} — ${fmtTime(item.at)}`,
        {
          body: body(item, settings),
          tag: item.id,
          requireInteraction: true,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          data: { url: '/#/prayer', prayer: item.prayer, kind: item.kind },
          showTrigger: new window.TimestampTrigger(item.at.getTime())
        }
      )
      armed++
    } catch { /* this one could not be armed; the in-page timer still covers it */ }
  }
  return armed
}

export function clearTimers() {
  timers.forEach(clearTimeout)
  timers = []
}

// Turning notifications off has to drop the native alarms too, or Android keeps
// firing them after the toggle says Off. Deliberately separate from clearTimers,
// which runs on every re-arm — cancelling there would race the new schedule.
export async function cancelAll() {
  clearTimers()
  await cancelNative().catch(() => {})
}

// Re-arm everything. Safe to call as often as you like — it clears first.
export async function schedule(settings, { onFire } = {}) {
  clearTimers()
  const n = settings.notifications || {}
  // Must be the *effective* permission: inside the APK the web Notification API
  // reports 'default' while the real grant lives with the OS.
  const perm = await effectivePermission()
  if (!n.enabled || perm !== 'granted' || !settings.location) return { armed: 0, mode: 'off' }

  const native = await isNative()
  const items = upcoming(settings, new Date(), native ? NATIVE_HORIZON_HOURS : HORIZON_HOURS)
  installedFor = `${settings.location.lat},${settings.location.lng},${settings.method},${settings.madhab}`

  // On Android the alarm manager does this properly: it fires in Doze, plays the
  // adhan as the notification sound and stays in the shade until tapped. Nothing
  // in the browser matches that, so when it is available it is what we use.
  if (native) {
    const r = await scheduleNative(items, settings)
    return { armed: items.length, inPage: 0, osArmed: r.scheduled, mode: 'native', days: Math.round(NATIVE_HORIZON_HOURS / 24) }
  }

  let osArmed = 0
  if (hasTriggers()) osArmed = await scheduleWithTriggers(items, settings)

  // In-page timers regardless: they are what let us play the adhan properly,
  // and they are the only thing that works where triggers are unavailable.
  // setTimeout is only accurate over shorter spans, so cap what we arm here.
  for (const item of items) {
    const delay = item.at - Date.now()
    if (delay <= 0 || delay > 6 * 3600000) continue
    timers.push(setTimeout(() => {
      if (alreadyFired(item.id)) return
      remember(item.id)
      show(item, settings)
      onFire?.(item)
    }, delay))
  }

  return {
    armed: items.length,
    inPage: timers.length,
    osArmed,
    mode: hasTriggers() ? 'os' : 'foreground'
  }
}

// On open, announce anything that became due while the app was closed and was
// never shown — but only recently, so you are not told about Fajr at 9pm.
export async function catchUp(settings, { windowMinutes = 30, onFire } = {}) {
  const n = settings.notifications || {}
  // Native notifications are delivered by Android itself, so there is nothing
  // for the app to catch up on when it opens.
  if (await isNative()) return null
  const perm = await effectivePermission()
  if (!n.enabled || perm !== 'granted' || !settings.location) return null

  const now = new Date()
  const t = timesFor(settings, now)
  if (!t) return null
  const key = dateKey(now)

  let latest = null
  for (const p of FARD) {
    const sound = prayerSound(settings, p.id)
    if (sound === 'off') continue
    const at = t[p.id]
    const age = now - at
    if (age >= 0 && age <= windowMinutes * 60000) {
      const id = `${key}:${p.id}`
      if (!alreadyFired(id)) latest = { id, prayer: p.id, label: p.label, at, kind: 'adhan', sound }
    }
  }
  if (!latest) return null
  remember(latest.id)
  await show(latest, settings)
  onFire?.(latest)
  return latest
}

// The onboarding "does this actually work on your phone" check — Part 9 of the
// design notes calls for exactly this, because OEM battery managers silently
// break background alarms and users blame the app.
export async function sendTest(settings) {
  if (permission() !== 'granted') return { ok: false, reason: 'Notifications are not allowed yet.' }
  const reg = await registration()
  const options = {
    body: 'If you can see this, notifications work on this device. Prayer times will arrive the same way.',
    tag: 'sabeel-test',
    requireInteraction: true,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: '/#/notifications' }
  }
  try {
    if (reg) await reg.showNotification('Sabeel test notification', options)
    else new Notification('Sabeel test notification', options)
    return { ok: true, via: reg ? 'service worker' : 'page' }
  } catch (e) {
    return { ok: false, reason: e.message }
  }
}

export async function describeReliabilityAsync() {
  if (await isNative()) {
    return {
      level: 'best',
      text: 'Running as an installed Android app. Prayer times are scheduled with Android’s own alarm manager, so they fire on time even in Doze, sound the adhan, and stay in the notification shade until you deal with them.'
    }
  }
  return describeReliability()
}

export function describeReliability() {
  if (!supported()) return { level: 'none', text: 'This browser cannot show notifications at all.' }
  // describeReliabilityAsync answers for the native case before reaching here.
  if (hasTriggers()) {
    return {
      level: 'good',
      text: 'This browser can hand prayer times to the operating system, so notifications arrive even when Sabeel is closed.'
    }
  }
  return {
    level: 'partial',
    text: 'This browser has no way to schedule a notification for a closed app without a server — and Sabeel has no server by design. Notifications fire reliably while Sabeel is open or in the background, and anything missed is shown when you next open it.'
  }
}

export const lastScheduledFor = () => installedFor
