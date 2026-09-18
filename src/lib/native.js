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

// The app's own location plugin, registered in MainActivity. See
// android/app/src/main/java/app/sabeel/quran/LocationPlugin.java for why this
// does not use Capacitor's Geolocation plugin.
let locationPlugin = null
async function sabeelLocation() {
  if (locationPlugin !== null) return locationPlugin
  if (!(await core())) { locationPlugin = false; return false }
  try {
    const { registerPlugin } = await import('@capacitor/core')
    locationPlugin = registerPlugin('SabeelLocation')
  } catch {
    locationPlugin = false
  }
  return locationPlugin
}

/** Is the device's Location switch on? Null when we cannot tell (the web). */
export async function locationServicesEnabled() {
  const p = await sabeelLocation()
  if (!p) return null
  try { return Boolean((await p.isEnabled()).enabled) } catch { return null }
}

/** Open Android's location settings. False when there is nothing to open. */
export async function openLocationSettings() {
  const p = await sabeelLocation()
  if (!p) return false
  try { await p.openSettings(); return true } catch { return false }
}

/**
 * A fix from Android itself rather than from the WebView.
 * @returns a position, or null when this is not the app, so the caller falls
 *          back to navigator.geolocation.
 * @throws  an Error with `.code` of 'denied' | 'servicesOff' | 'timeout' |
 *          'unavailable' | 'unsupported'
 */
function withDeadline(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(Object.assign(new Error('The location service did not answer.'), { code: 'timeout' })),
      ms
    )
    promise.then(
      v => { clearTimeout(timer); resolve(v) },
      e => { clearTimeout(timer); reject(e) }
    )
  })
}

export async function nativePosition({ timeout = 15000, maximumAge = 300000 } = {}) {
  const p = await sabeelLocation()
  if (!p) return null
  try {
    // Raced against a deadline of our own.
    //
    // A bridge call that never settles is the worst failure there is: the app
    // waits for ever on "Getting your location…" with nothing to retry and no
    // error to show. That happened — an exception inside the plugin skipped the
    // timeout it was supposed to arm — and while that bug is fixed, the app
    // should not be relying on the other side of a bridge to always answer.
    // The grace is on top of the timeout the plugin is given, so in the normal
    // case the plugin's own answer always wins.
    const r = await withDeadline(p.getPosition({ timeout, maximumAge }), timeout + 5000)
    return {
      lat: r.latitude,
      lng: r.longitude,
      accuracy: r.accuracy ?? null,
      label: 'Current location',
      source: 'gps'
    }
  } catch (e) {
    // Capacitor puts the reject code on `.code`; older bridges only carry the
    // message, so an unrecognised failure is reported as merely unavailable
    // rather than as a refusal the user never made.
    const code = e?.code && typeof e.code === 'string' ? e.code : 'unavailable'
    throw Object.assign(new Error(e?.message || 'Location is unavailable.'), { code })
  }
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

// Android identifies an alarm by an integer, and scheduling the same integer
// twice replaces the first — which is what makes re-arming safe to do as often
// as we like.
//
// This used to hash the item's string id into 100,000 buckets. Over a single day
// that was fine. Over a week of prayers and reminders it is around eighty
// alarms, and the chance that two of them collide is a few percent — a collision
// meaning one prayer quietly overwrites another and never sounds. So the id is
// derived rather than hashed: the day, the prayer, and whether it is the call or
// the reminder before it. Two different prayers cannot produce the same number.
const SLOT = { fajr: 0, sunrise: 1, dhuhr: 2, asr: 3, maghrib: 4, isha: 5 }

const idFor = (item) => {
  const day = Math.floor(item.at.getTime() / 86400000) % 20000   // days since 1970, wraps in 54 years
  const slot = (SLOT[item.prayer] ?? 6) * 2 + (item.kind === 'reminder' ? 1 : 0)
  return day * 100 + slot + 1                                    // at most 2,000,014 — an int, as Android requires
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

  // A week of five prayers, sunrise and a reminder each is about eighty. The cap
  // is here so a strange setting cannot ask Android for hundreds of alarms.
  const payload = items.slice(0, 128).map(item => ({
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

// The "does this actually work on my phone" button.
//
// It used to go through the web Notification API for everyone, which inside the
// APK means an API the WebView does not provide — so the one button whose whole
// purpose is to prove notifications work reported that they were not allowed,
// on a phone where they were already scheduled and working.
//
// Scheduled a moment out rather than shown immediately, so it arrives through
// the same alarm path a prayer does and demonstrates that path rather than a
// different one.
export async function testNative(settings = {}) {
  const LN = await notifications()
  if (!LN) return { ok: false, reason: 'Notifications are not available on this device.' }
  await ensureChannels(settings)

  const n = settings.notifications || {}
  const res = resourceFor(n.adhanId)
  const mode = allSameMode(settings)
  const channel = mode === 'adhan' && res ? adhanChannel(res, 'std') : CHANNELS[mode] || CHANNELS.beep

  try {
    await LN.schedule({
      notifications: [{
        id: 2147483000,                        // far above any prayer's id
        title: 'Sabeel test notification',
        body: 'If you can see this, notifications work on this device. Prayer times will arrive the same way.',
        channelId: channel.id,
        schedule: { at: new Date(Date.now() + 2000), allowWhileIdle: true },
        autoCancel: false,
        smallIcon: 'ic_stat_sabeel',
        iconColor: '#6ABE8F',
        extra: { kind: 'test', url: '/#/notifications' }
      }]
    })
    return { ok: true, via: 'Android', delayed: true }
  } catch (e) {
    return { ok: false, reason: e.message }
  }
}

// Which sound a test should make: whatever the prayers are set to, when they
// agree, and the adhan when they do not — there is no single sound to stand for
// a mixture.
function allSameMode(settings) {
  const per = settings.notifications?.perPrayer || {}
  const modes = new Set(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].map(p => per[p] || 'adhan'))
  return modes.size === 1 ? [...modes][0] : 'adhan'
}

/**
 * What Android actually thinks is going on.
 *
 * "Notifications are on but nothing arrives" is the commonest complaint about
 * every prayer app, and from the outside it is indistinguishable between a
 * dozen causes: the permission, the plugin, a channel that failed to create, an
 * alarm the OEM dropped, a battery saver. Guessing at it from a description has
 * already cost this app two wrong fixes, so the app can now be asked.
 *
 * Every field is a fact read back from the system rather than what this code
 * believes it did.
 */
export async function nativeDiagnostics() {
  const out = { native: await isNative() }
  if (!out.native) return out

  const LN = await notifications()
  out.plugin = Boolean(LN)
  if (!LN) return out

  try {
    const p = await LN.checkPermissions()
    out.permission = p.display
  } catch (e) { out.permission = `error: ${e?.message || e}` }

  try {
    const { channels } = await LN.listChannels()
    out.channels = (channels || []).map(c => ({ id: c.id, importance: c.importance, sound: c.sound || null }))
  } catch (e) { out.channels = `error: ${e?.message || e}` }

  try {
    const { notifications: pending } = await LN.getPending()
    out.pending = (pending || []).length
    out.next = (pending || [])
      .map(n => n.schedule?.at)
      .filter(Boolean)
      .sort()
      .slice(0, 3)
  } catch (e) { out.pending = `error: ${e?.message || e}` }

  try {
    out.exactAlarms = await exactAlarmsAllowed()
  } catch { /* older plugin */ }

  return out
}

// Whether Android will honour an exact alarm. Below Android 12 it always will;
// above it, this is a permission the user or the manufacturer can withhold, and
// without it a prayer can arrive minutes late or be batched away entirely.
async function exactAlarmsAllowed() {
  const LN = await notifications()
  if (!LN?.checkExactNotificationSetting) return 'unknown'
  const r = await LN.checkExactNotificationSetting()
  return r?.exact_alarm || 'unknown'
}

/**
 * Open Android's "Alarms & reminders" setting for this app.
 *
 * From Android 12 this is a permission that can be withheld, and without it a
 * prayer notification is not an exact alarm any more: Android is free to batch
 * it with whatever else it is delivering, which on a sleeping phone can mean
 * minutes late or not until the screen comes on.
 */
export async function openExactAlarmSetting() {
  const LN = await notifications()
  if (!LN?.changeExactNotificationSetting) return false
  try { await LN.changeExactNotificationSetting(); return true } catch { return false }
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
