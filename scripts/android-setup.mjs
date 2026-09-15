// Everything the Android project needs that `npx cap add android` does not do.
// Idempotent, so it is safe to re-run after regenerating the platform.
//
//   * The permissions prayer alarms actually require — exact alarms and
//     post-notifications are both runtime-gated on modern Android, and without
//     RECEIVE_BOOT_COMPLETED every scheduled prayer is lost on restart.
//   * The adhan as a real notification sound in res/raw.
//   * A monochrome status-bar icon; Android renders the launcher icon as a
//     white blob if you do not supply one.
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, ensure, log, writeJSON } from './_util.mjs'

const ANDROID = path.join(ROOT, 'android')
if (!fs.existsSync(ANDROID)) {
  console.error('No android/ directory. Run: npx cap add android')
  process.exit(1)
}

const MAIN = path.join(ANDROID, 'app', 'src', 'main')
const manifestPath = path.join(MAIN, 'AndroidManifest.xml')

log('Sabeel · Android setup')

/* ------------------------------ permissions ------------------------------ */

const PERMISSIONS = [
  ['android.permission.INTERNET', 'streaming recitation'],
  ['android.permission.POST_NOTIFICATIONS', 'prayer notifications on Android 13+'],
  ['android.permission.SCHEDULE_EXACT_ALARM', 'prayer times must fire at the exact minute'],
  ['android.permission.USE_EXACT_ALARM', 'Android 14+ grants this to alarm/prayer apps without a prompt'],
  ['android.permission.VIBRATE', 'the vibrate option'],
  ['android.permission.RECEIVE_BOOT_COMPLETED', 'reschedule prayers after a restart'],
  ['android.permission.WAKE_LOCK', 'let the notification fire while the device is dozing'],
  ['android.permission.FOREGROUND_SERVICE', 'keep recitation playing in the background'],
  // Without these two, navigator.geolocation inside the WebView fails outright on
  // Android — Capacitor's bridge only raises the runtime prompt for permissions
  // the manifest declares. Prayer times and the qibla both depend on a fix, so
  // "Use my location" was silently impossible in the APK until this was added.
  ['android.permission.ACCESS_COARSE_LOCATION', 'prayer times and qibla for where you are'],
  ['android.permission.ACCESS_FINE_LOCATION', 'a more exact fix, when the device offers one']
]

let manifest = fs.readFileSync(manifestPath, 'utf8')
let added = 0
for (const [perm, why] of PERMISSIONS) {
  if (manifest.includes(perm)) continue
  manifest = manifest.replace(
    '</manifest>',
    `    <!-- ${why} -->\n    <uses-permission android:name="${perm}" />\n</manifest>`
  )
  added++
}

// Audio should keep playing when the screen goes off, not stop mid-ayah.
if (!manifest.includes('android:usesCleartextTraffic')) {
  manifest = manifest.replace('android:allowBackup="true"', 'android:allowBackup="true"\n        android:usesCleartextTraffic="false"')
}

fs.writeFileSync(manifestPath, manifest)
log(`  manifest: ${added} permission(s) added`)

/* -------------------------- adhan notification sound --------------------- */

const raw = ensure(path.join(MAIN, 'res', 'raw'))
// Android notification sounds are raw resources, and a channel's sound is fixed
// the moment Android creates the channel — it cannot be changed afterwards. So
// every adhan is installed as its own raw resource and the app creates one
// channel per recording, switching channel when you pick a different adhan.
// That is the only way a choice of adhan actually reaches the notification.
//
// Resource names may only contain lowercase letters, digits and underscores.
const catalogue = path.join(ROOT, 'public', 'data', 'adhan.json')
const adhanDir = path.join(ROOT, 'public', 'adhan')
let list = []
try { list = JSON.parse(fs.readFileSync(catalogue, 'utf8')).adhans || [] } catch { /* not built yet */ }

export const resName = id => 'adhan_' + String(id).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')

// Clear out sounds from a previous build so res/raw does not accumulate adhans
// that are no longer in the catalogue — they would bloat the APK and linger in
// the system's notification-sound list.
for (const f of fs.readdirSync(raw)) {
  if (/^adhan.*\.(mp3|ogg|oga|wav)$/i.test(f)) fs.rmSync(path.join(raw, f))
}

const installed = []
for (const entry of list) {
  const src = path.join(adhanDir, entry.file)
  if (!fs.existsSync(src)) { log(`  ! ${entry.file} not found in public/adhan`); continue }
  const ext = path.extname(entry.file).replace('.oga', '.ogg')
  const res = resName(entry.id) + ext
  fs.copyFileSync(src, path.join(raw, res))
  installed.push({ id: entry.id, res: resName(entry.id) })
  log(`  res/raw/${res} ← ${entry.muadhdhin} (${(fs.statSync(src).size / 1024).toFixed(0)} KB)`)
}

// A manifest the app reads at runtime to know which raw resource backs which
// adhan id, so the two never drift apart.
if (installed.length) {
  writeJSON(path.join(ROOT, 'public', 'data', 'android-sounds.json'), { sounds: installed })
  log(`  data/android-sounds.json — ${installed.length} selectable notification sound(s)`)
} else {
  log('  ! no adhan installed — run `npm run data:adhan` first')
}

/* --------------------------- status bar icon ----------------------------- */

// Android tints the status-bar icon and discards colour, so it must be a
// single-colour silhouette on transparency. The eight-pointed khatim again.
const icon = `<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp" android:height="24dp"
    android:viewportWidth="24" android:viewportHeight="24">
  <path android:fillColor="#FFFFFFFF"
      android:pathData="M12,2L14.6,6.5L19.8,6.2L17.5,10.8L21.5,14L16.6,15.8L16.9,21L12,18.6L7.1,21L7.4,15.8L2.5,14L6.5,10.8L4.2,6.2L9.4,6.5Z"/>
</vector>
`
const drawable = ensure(path.join(MAIN, 'res', 'drawable'))
fs.writeFileSync(path.join(drawable, 'ic_stat_sabeel.xml'), icon)
log('  res/drawable/ic_stat_sabeel.xml')

/* ------------------------------- colours --------------------------------- */

const values = ensure(path.join(MAIN, 'res', 'values'))
const colorsPath = path.join(values, 'colors.xml')
let colors = fs.existsSync(colorsPath) ? fs.readFileSync(colorsPath, 'utf8') : '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n</resources>\n'
for (const [name, value] of [['colorPrimary', '#0F1711'], ['colorPrimaryDark', '#0F1711'], ['colorAccent', '#6ABE8F'], ['splash_background', '#0F1711']]) {
  if (colors.includes(`"${name}"`)) {
    colors = colors.replace(new RegExp(`<color name="${name}">[^<]*</color>`), `<color name="${name}">${value}</color>`)
  } else {
    colors = colors.replace('</resources>', `    <color name="${name}">${value}</color>\n</resources>`)
  }
}
fs.writeFileSync(colorsPath, colors)
log('  res/values/colors.xml')

log('  Done. Next: npx cap sync android, then build in Android Studio.')
