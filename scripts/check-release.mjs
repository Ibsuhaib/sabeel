// Is this tree in a state that could actually be published?
//
// Every one of these has the same failure mode: nothing goes wrong until the
// day you try to ship, and then it goes wrong after a twenty-minute build or,
// worse, after an upload Play then rejects.
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, log } from './_util.mjs'

let bad = 0
const fail = m => { bad++; console.log(`  \u2717 ${m}`) }
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8')

log('Sabeel \u00b7 Release readiness')

const gradle = read('android/app/build.gradle')
const vars = read('android/variables.gradle')

// Play rejects an upload whose versionCode is not higher than the last, and a
// hard-coded one can only be bumped by remembering to bump it.
if (!/versionCode\s+gitCommitCount\(\)/.test(gradle)) fail('versionCode is not derived from git')
if (!/versionName\s+readableVersion\(\)/.test(gradle)) fail('versionName is not read from VERSION')
if (!fs.existsSync(path.join(ROOT, 'VERSION'))) fail('VERSION file is missing')

// Play's minimum target moves every year; being under it blocks new uploads.
const target = Number(/targetSdkVersion\s*=\s*(\d+)/.exec(vars)?.[1])
if (!(target >= 35)) fail(`targetSdk is ${target}; Play requires 35 or higher`)

// Shrinking is on, so the rules that keep Capacitor alive must be too. Without
// them the app builds, installs, runs, and silently has no plugins.
if (/minifyEnabled true/.test(gradle)) {
  const rules = read('android/app/proguard-rules.pro')
  for (const need of ['com.getcapacitor.**', 'extends com.getcapacitor.Plugin', 'JavascriptInterface']) {
    if (!rules.includes(need)) fail(`minify is on but proguard-rules.pro does not keep ${need}`)
  }
}

// Signing material must never be committed.
const ignore = read('.gitignore')
for (const pat of ['*.jks', '*.keystore', 'keystore.properties']) {
  if (!ignore.includes(pat)) fail(`.gitignore does not exclude ${pat}`)
}

// Play will not list an app without one.
if (!fs.existsSync(path.join(ROOT, 'PRIVACY.md'))) fail('PRIVACY.md is missing — Play requires a privacy policy')

// Every permission has to be justifiable in the Play console; an unexplained one
// is a review delay.
const manifest = read('android/app/src/main/AndroidManifest.xml')
const perms = [...manifest.matchAll(/android:name="android\.permission\.([A-Z_]+)"/g)].map(m => m[1])
const explained = read('PRIVACY.md').toLowerCase()
const map = {
  ACCESS_COARSE_LOCATION: 'location', ACCESS_FINE_LOCATION: 'location',
  POST_NOTIFICATIONS: 'notification', SCHEDULE_EXACT_ALARM: 'exact alarm',
  USE_EXACT_ALARM: 'exact alarm', RECEIVE_BOOT_COMPLETED: 'startup',
  VIBRATE: 'vibrate', INTERNET: 'internet'
}
for (const p of perms) {
  const word = map[p]
  if (word && !explained.includes(word)) fail(`permission ${p} is not explained in PRIVACY.md`)
}

if (bad) { console.log(`\n  ${bad} thing(s) would block a release.`); process.exit(1) }
log(`  targetSdk ${target} \u00b7 ${perms.length} permissions, all explained \u00b7 version from git \u00b7 keys ignored`)
