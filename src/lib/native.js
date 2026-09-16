// The Android (Capacitor) bridge.
//
// In the browser, a PWA cannot reliably wake itself for Fajr — that limitation
// is documented honestly in notifications.js. Inside the APK it is simply not a
// limitation any more: Android's own alarm manager schedules the notification,
// it fires in Doze, it plays the adhan as the notification sound, and it stays
// in the shade until it is tapped.
//
// Everything here is loaded dynamically, so the web build never pulls the
// Capacitor plugins into its bundle.

let capacitor = null
let checked = false

async function core() {
  if (checked) return capacitor
  checked = true
  try {
    const mod = await import('@capacitor/core')
    capacitor = mod.Capacitor?.isNativePlatform?.() ? mod.Capacitor : null
  } catch {
    capacitor = null
  }
  return capacitor
}

export async function isNative() {
  return !!(await core())
}

export async function platform() {
  const c = await core()
  return c ? c.getPlatform() : 'web'
}

async function notifications() {
  if (!(await core())) return null
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    return LocalNotifications
  } catch { return null }
}

export async function requestNativePermission() {
  const LN = await notifications()
  if (!LN) return 'unsupported'
  try {
    const res = await LN.requestPermissions()
    return res.display === 'granted' ? 'granted' : 'denied'
  } catch { return 'denied' }
}

export async function nativePermission() {
  const LN = await notifications()
  if (!LN) return 'unsupported'
  try {
    const res = await LN.checkPermissions()
    return res.display
  } catch { return 'denied' }
}

// Android channels decide the sound and importance. Three of them, one per
// sound mode, because a channel's sound cannot be changed after it is created —
// switching channel is the only way to switch sound on Android 8+.
// Fajr gets its own channel because its adhan is a different recording — the one
// with the tathwīb — and a channel's sound is fixed once Android has created it.
const CHANNELS = {
  beep: { id: 'sabeel-chime', name: 'Prayer times (chime)', sound: undefined, importance: 5 },
  silent: { id: 'sabeel-silent', name: 'Prayer times (silent)', sound: undefined, importance: 3 }
}

// A channel's sound is fixed when Android creates it and can never be changed,
// so "let the user pick an adhan" means a channel per recording, not one channel
// whose sound is edited. The id encodes the recording, so picking a different
// adhan simply routes to a different channel — and the old one is deleted so the
// system settings list does not fill up with every adhan ever tried.
const adhanChannel = (res, slot) => ({
  id: `sabeel-adhan-${slot}-${res}`,
  name: slot === 'fajr' ? 'Fajr (adhan)' : 'Prayer times (adhan)',
  sound: res,
  importance: 5
})

// The raw resource an adhan is installed as. Derived from the id by the same
// rule scripts/android-setup.mjs uses when it copies the file in, rather than
// read from a manifest: android-setup runs after `cap sync` has already copied
// the web assets, so any file it wrote would never reach the APK — and reading
// it would be a fetch at the moment a prayer is being scheduled, which is
// exactly when the phone is least likely to want one. The smoke test checks the
// two spellings agree.
const resName = id =>
  'adhan_' + String(id).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')

const resourceFor = adhanId => (adhanId ? resName(adhanId) : null)

function wantedChannels(settings) {
  const n = settings.notifications || {}
  const out = [CHANNELS.beep, CHANNELS.silent]
  const std = resourceFor(n.adhanId)
  const fajr = resourceFor(n.fajrAdhanId || n.adhanId)
  if (std) out.push(adhanChannel(std, 'std'))
  if (fajr && fajr !== std) out.push(adhanChannel(fajr, 'fajr'))
  else if (fajr) out.push(adhanChannel(fajr, 'fajr'))
  return out
}

export async function ensureChannels(settings = {}) {
  const LN = await notifications()
  if (!LN?.createChannel) return false

  const wanted = wantedChannels(settings)
  const keep = new Set(wanted.map(c => c.id))

  for (const c of wanted) {
    try {
      await LN.createChannel({
        id: c.id,
        name: c.name,
        description: 'Notifies you at each prayer time.',
        importance: c.importance,
        visibility: 1,
        sound: c.sound,
        vibration: true,
        lights: true,
        lightColor: '#6ABE8F'
      })
    } catch { /* channel already exists, or this platform has none */ }
  }

  // Drop channels for adhans no longer selected.
  try {
    const { channels } = await LN.listChannels()
    for (const c of channels || []) {
      if (c.id.startsWith('sabeel-adhan-') && !keep.has(c.id)) await LN.deleteChannel({ id: c.id })
    }
  } catch { /* listChannels is not available on every platform */ }

  return true
}

// Android caps how many alarms an app may hold; a day of prayers plus reminders
// is around ten, which is comfortably inside every limit.
const idFor = (item) => {
  // Stable small integer from the item id, so re-scheduling replaces rather
  // than duplicates.
  let h = 0
  for (let i = 0; i < item.id.length; i++) h = (h * 31 + item.id.charCodeAt(i)) % 100000
  return h + 1
}

export async function scheduleNative(items, settings) {
  const LN = await notifications()
  if (!LN) return { scheduled: 0, native: false }

  await ensureChannels(settings)
  try { await LN.cancel({ notifications: (await LN.getPending()).notifications || [] }) } catch { /* nothing pending */ }

  const n = settings.notifications || {}
  const place = settings.location?.label
  const stdRes = resourceFor(n.adhanId)
  const fajrRes = resourceFor(n.fajrAdhanId || n.adhanId)

  // The mode travels on the item, so each prayer lands on the channel matching
  // its own setting. Fajr routes to its own channel only when the adhan is what
  // it is set to; a chime or silence is the same whatever the prayer.
  const channelFor = item => {
    const mode = item.sound || 'adhan'
    if (mode !== 'adhan') return CHANNELS[mode] || CHANNELS.beep
    const isFajr = item.prayer === 'fajr'
    const res = isFajr ? fajrRes : stdRes
    return res ? adhanChannel(res, isFajr ? 'fajr' : 'std') : CHANNELS.beep
  }

  const payload = items.slice(0, 60).map(item => ({
    id: idFor(item),
    title: item.kind === 'reminder' ? `${item.label} soon` : `${item.label}`,
    body: item.kind === 'reminder'
      ? `${item.label} is in ${item.minutes} minute${item.minutes === 1 ? '' : 's'}`
      : place ? `It is time for ${item.label} in ${place}` : `It is time for ${item.label}`,
    channelId: channelFor(item).id,
    // allowWhileIdle is what gets it past Doze; without it Fajr silently slips.
    schedule: { at: item.at, allowWhileIdle: true },
    // Stays in the shade until the user actually deals with it.
    autoCancel: false,
    ongoing: false,
    smallIcon: 'ic_stat_sabeel',
    iconColor: '#6ABE8F',
    extra: { prayer: item.prayer, kind: item.kind, url: '/#/prayer' }
  }))

  if (!payload.length) return { scheduled: 0, native: true }
  try {
    await LN.schedule({ notifications: payload })
    return { scheduled: payload.length, native: true }
  } catch (e) {
    return { scheduled: 0, native: true, error: e.message }
  }
}

export async function cancelNative() {
  const LN = await notifications()
  if (!LN) return false
  try {
    const pending = await LN.getPending()
    if (pending.notifications?.length) await LN.cancel({ notifications: pending.notifications })
    return true
  } catch { return false }
}

export async function pendingCount() {
  const LN = await notifications()
  if (!LN) return 0
  try { return (await LN.getPending()).notifications?.length || 0 } catch { return 0 }
}

// Tapping a native notification should land on the prayer screen.
export async function onNotificationTap(handler) {
  const LN = await notifications()
  if (!LN) return () => {}
  try {
    const sub = await LN.addListener('localNotificationActionPerformed', ev => {
      handler(ev.notification?.extra || {})
    })
    return () => sub.remove()
  } catch { return () => {} }
}

// Android's hardware back button. Without handling it, back closes the whole
// app from any screen, which on Android reads as a crash. Here it walks the
// history first and only exits from the home screen — and then only on a second
// press, the convention every Android user already knows.
export async function wireBackButton({ canGoBack, goBack, atRoot, toRoot }) {
  if (!(await core())) return () => {}
  let App
  try { ({ App } = await import('@capacitor/app')) } catch { return () => {} }

  let armed = false
  let timer = null

  const sub = await App.addListener('backButton', () => {
    // Android's own convention: back closes the keyboard before it leaves the
    // screen. Navigating out from under someone who is still typing is jarring
    // and loses what they were writing.
    const el = document.activeElement
    if (el && /^(INPUT|TEXTAREA)$/.test(el.tagName)) { el.blur(); return }

    if (!atRoot()) {
      if (canGoBack()) goBack()
      else toRoot()
      return
    }
    if (armed) { App.exitApp(); return }
    armed = true
    clearTimeout(timer)
    timer = setTimeout(() => { armed = false }, 2000)
    try { window.dispatchEvent(new CustomEvent('sabeel:press-back-again')) } catch { /* ignore */ }
  })

  return () => { clearTimeout(timer); sub.remove() }
}

// Native chrome polish — a status bar that matches the theme rather than a
// white strip above a dark app.
export async function applyNativeChrome(theme) {
  if (!(await core())) return
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    const dark = theme === 'dark' || theme === 'black'
    await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light })
    await StatusBar.setBackgroundColor({ color: theme === 'black' ? '#000000' : dark ? '#0F1711' : '#FAF9F6' })
  } catch { /* not on a platform with a status bar */ }
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen')
    await SplashScreen.hide()
  } catch { /* no splash */ }
}
