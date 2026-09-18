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
// splash_background is deliberately absent: it is the artwork's own ground and
// make-icons.mjs writes it into brand_ground.xml, sampled from the logo. The
// value here was a hand-typed #0F1711 — the app's dark surface, a few values off
// the artwork — which showed as a disc of the wrong green behind the icon on the
// Android 12 launch screen.
for (const [name, value] of [['colorPrimary', '#0F1711'], ['colorPrimaryDark', '#0F1711'], ['colorAccent', '#6ABE8F']]) {
  if (colors.includes(`"${name}"`)) {
    colors = colors.replace(new RegExp(`<color name="${name}">[^<]*</color>`), `<color name="${name}">${value}</color>`)
  } else {
    colors = colors.replace('</resources>', `    <color name="${name}">${value}</color>\n</resources>`)
  }
}
// An earlier version of this script wrote splash_background here. Left behind,
// it would be declared twice — once with the old hand-typed green, once with the
// artwork's in brand_ground.xml — and which of the two won would be up to aapt.
colors = colors.split(/\r?\n/)
  .filter(line => !line.includes('name="splash_background"'))
  .join('\n')

fs.writeFileSync(colorsPath, colors)
log('  res/values/colors.xml')

/* -------------------------- the Android 12 splash ------------------------- */

// From Android 12 the system draws the launch screen itself and ignores the
// drawable the older theme points at. Told nothing, it falls back to a default
// background with the launcher icon on it — which is how a launch could show the
// logo on a colour the app never uses.
//
// The icon named is the adaptive one rather than its foreground layer, so the
// system insets and masks it exactly as the launcher does and the logo comes up
// at the same size in both places. Its background layer is the same colour as
// splash_background, so the circle the mask cuts is invisible and what is left
// is the arch on the app's green.
//
// Only the two window attributes are set. postSplashScreenTheme is deliberately
// not, because it requires installSplashScreen() to be called before onCreate
// and this project's MainActivity is a plain BridgeActivity; setting it without
// that call can leave the app sitting on the launch theme.
const v31 = ensure(path.join(MAIN, 'res', 'values-v31'))
fs.writeFileSync(path.join(v31, 'styles.xml'), `<?xml version="1.0" encoding="utf-8"?>
<!-- Generated by scripts/android-setup.mjs. Do not edit. -->
<resources>
    <style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
        <item name="android:background">@drawable/splash</item>
        <item name="android:windowSplashScreenBackground">@color/splash_background</item>
        <item name="android:windowSplashScreenAnimatedIcon">@mipmap/ic_launcher</item>
    </style>
</resources>
`)
log('  res/values-v31/styles.xml')

log('  Done. Next: npx cap sync android, then build in Android Studio.')
