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
import { dateKey, fmtTime } from './format.js'

const FIRED_KEY = 'sabeel.notified.v1'
const HORIZON_HOURS = 24

let timers = []
let installedFor = null

export const supported = () => typeof window !== 'undefined' && 'Notification' in window
export const permission = () => (supported() ? Notification.permission : 'unsupported')

// TimestampTrigger is the only way a closed PWA fires on time without a server.
export const hasTriggers = () =>
  typeof window !== 'undefined' && 'Notification' in window && 'showTrigger' in Notification.prototype

export async function requestPermission() {
  if (!supported()) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  try { return await Notification.requestPermission() } catch { return 'denied' }
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

// Every prayer in the next 24 hours that the user has switched on, plus its
// optional "it starts soon" reminder.
export function upcoming(settings, from = new Date()) {
  const n = settings.notifications || {}
  if (!settings.location) return []

  const out = []
  for (let dayOffset = 0; dayOffset <= 1; dayOffset++) {
    const day = new Date(from.getTime() + dayOffset * 86400000)
    const t = timesFor(settings, day)
    if (!t) continue
    const key = dateKey(day)

    for (const p of PRAYERS) {
      if (!p.isPrayer && !n.notifySunrise) continue
      if (n.perPrayer && n.perPrayer[p.id] === false) continue

      const at = t[p.id]
      if (!(at instanceof Date) || Number.isNaN(at.getTime())) continue

      if (at > from && at - from < HORIZON_HOURS * 3600000) {
        out.push({ id: `${key}:${p.id}`, prayer: p.id, label: p.label, at, kind: 'adhan' })
      }

      const mins = Number(n.reminderMinutes) || 0
      if (mins > 0) {
        const early = new Date(at.getTime() - mins * 60000)
        if (early > from && early - from < HORIZON_HOURS * 3600000) {
          out.push({ id: `${key}:${p.id}:pre`, prayer: p.id, label: p.label, at: early, kind: 'reminder', minutes: mins })
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
    silent: (settings.notifications?.sound === 'silent') && !settings.notifications?.systemSound,
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

// Re-arm everything. Safe to call as often as you like — it clears first.
export async function schedule(settings, { onFire } = {}) {
  clearTimers()
  const n = settings.notifications || {}
  if (!n.enabled || permission() !== 'granted' || !settings.location) return { armed: 0, mode: 'off' }

  const items = upcoming(settings)
  installedFor = `${settings.location.lat},${settings.location.lng},${settings.method},${settings.madhab}`

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
  if (!n.enabled || permission() !== 'granted' || !settings.location) return null

  const now = new Date()
  const t = timesFor(settings, now)
  if (!t) return null
  const key = dateKey(now)

  let latest = null
  for (const p of FARD) {
    if (n.perPrayer && n.perPrayer[p.id] === false) continue
    const at = t[p.id]
    const age = now - at
    if (age >= 0 && age <= windowMinutes * 60000) {
      const id = `${key}:${p.id}`
      if (!alreadyFired(id)) latest = { id, prayer: p.id, label: p.label, at, kind: 'adhan' }
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

export function describeReliability() {
  if (!supported()) return { level: 'none', text: 'This browser cannot show notifications at all.' }
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
