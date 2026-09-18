// What the app says when it cannot get a position.
//
// This exists because of a real report: the permission prompt was answered with
// "Allow this time", the fix failed anyway, and the app said "Location is
// unavailable right now. Pick a city instead." The actual cause was the phone's
// Location switch being off — one toggle away — and the app had told the person
// to give up instead. The browser reports both with the same error code, so the
// difference has to be worked out rather than read off.
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, log } from './_util.mjs'

let failed = 0
const fail = m => { failed++; console.log(`  \u2717 ${m}`) }
const is = (got, want, what) => { if (got !== want) fail(`${what}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`) }

// Stand in for the browser. `calls` records what accuracy each attempt asked for,
// which is how the fallback is observed.
let calls = []
function stubGeo(plan, permission) {
  calls = []
  // Node has its own read-only `navigator`, so it has to be redefined rather
  // than assigned.
  Object.defineProperty(globalThis, 'navigator', { configurable: true, writable: true, value: {
    geolocation: {
      getCurrentPosition(ok, err, opts) {
        calls.push(opts.enableHighAccuracy ? 'high' : 'low')
        const step = plan[calls.length - 1]
        if (step && step.ok) ok({ coords: { latitude: 21.42, longitude: 39.83, accuracy: step.ok } })
        else err({ code: step ? step.code : 2 })
      }
    },
    permissions: { query: async () => ({ state: permission }) }
  } })
}

const { locate } = await import('../src/lib/locate.js')

const attempt = async (plan, permission) => {
  stubGeo(plan, permission)
  try { return { value: await locate() } } catch (e) { return { code: e.code, message: e.message } }
}

/* ---------------- the report: permission given, switch off ---------------- */

// POSITION_UNAVAILABLE with permission granted can only be the device switch.
let r = await attempt([{ code: 2 }, { code: 2 }], 'granted')
is(r.code, 'servicesOff', 'permission granted but no fix')
if (r.code === 'servicesOff') log('  permission granted, no fix \u2192 says the phone\u2019s Location switch is off')

// The same code without permission is genuinely just unavailable, and must not
// blame a switch that may be perfectly on.
r = await attempt([{ code: 2 }, { code: 2 }], 'prompt')
is(r.code, 'unavailable', 'no permission and no fix')

// A refusal is a refusal.
r = await attempt([{ code: 1 }], 'denied')
is(r.code, 'denied', 'permission refused')
is(calls.length, 1, 'a refusal must not be retried')

/* ------------------------- the fallback to network ------------------------ */

// Indoors the satellite fix times out where the network position would have
// worked, so a high-accuracy failure is retried once without it.
r = await attempt([{ code: 3 }, { ok: 65 }], 'granted')
if (r.value) log(`  high accuracy timed out \u2192 retried without it and got a fix (\u00b1${r.value.accuracy} m)`)
else fail(`expected the low-accuracy retry to succeed, got ${r.code}`)
is(calls.join(','), 'high,low', 'the retry must drop high accuracy')

// And it gives up after the second try rather than looping.
r = await attempt([{ code: 3 }, { code: 3 }], 'granted')
is(r.code, 'timeout', 'both attempts timed out')
is(calls.length, 2, 'exactly two attempts')

/* ---------------------------- the wording itself -------------------------- */

// isNative() is false under node, so the message above is the desktop one. The
// phone wording is checked against the source, since that is what people read.
const src = fs.readFileSync(path.join(ROOT, 'src', 'lib', 'locate.js'), 'utf8')
const phone = /servicesOff: '([^']+)'/.exec(src)?.[1] || ''
if (/pick a city/i.test(phone)) fail('the phone message still tells people to give up and pick a city')
if (!/switched off/i.test(phone)) fail('the phone message does not say the switch is off')

// Telling someone where the tile lives was the first attempt, and a poor one —
// every manufacturer puts it somewhere different. The app opens the page itself
// now, so the message states the fact and the button does the work.
const err = fs.readFileSync(path.join(ROOT, 'src', 'components', 'LocationError.jsx'), 'utf8')
if (!err.includes('openLocationSettings')) fail('there is no way to open the location settings')
if (!err.includes('visibilitychange')) {
  fail('coming back from settings does not retry, so the error stays on screen after being fixed')
}
if (!/native === true/.test(err)) fail('the settings button is not held back from the web, where it does nothing')
if (!failed) log(`  the switch being off offers a button to the settings page, and retries on return`)

// And the native path has to be tried before the WebView's, which is the whole
// point — the WebView reported a grant and then produced no fix.
if (!/const native = await nativePosition/.test(src)) {
  fail('locate() does not ask Android first, so the APK is still on WebView geolocation')
}

// It must be a fallback and not a replacement. The first version rethrew
// whatever the native side said, so one failure there took the WebView path away
// as well — and that path had been working. That regression is the one that
// mattered, so it is checked directly.
if (!src.includes('nativeFailure = e')) {
  fail('a native failure is not stepped over, so it can still take the WebView path down with it')
}
if (!src.includes('let nativeFailure = null')) {
  fail('locate() does not remember the native failure to report later')
}
if (!failed) log('  a native failure falls through to the WebView instead of ending the attempt')

// The Android side must accept Approximate. Capacitor treats an alias holding
// several permissions as all-or-nothing — its own comment says so — and from
// Android 12 the dialog grants coarse while refusing fine, which then read as a
// refusal of a request the user had actually allowed.
const plugin = path.join(ROOT, 'android/app/src/main/java/app/sabeel/quran/LocationPlugin.java')
if (fs.existsSync(plugin)) {
  // Comments stripped first. The plugin explains in prose why it does *not* use
  // getPermissionState, and scanning the raw text found that sentence and called
  // it the bug — the same way check-imports.mjs once matched "Icon.jsx" inside a
  // comment and reported a missing import.
  const java = fs.readFileSync(plugin, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1')
  if (java.includes('getPermissionState("location")')) {
    fail('the plugin checks permission through the alias, which fails when only Approximate was granted')
  }
  if (!java.includes('ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED')) {
    fail('the plugin does not accept coarse location on its own')
  }
  if (!failed) log('  approximate location counts as granted, which is what Android 12 hands back')
}

/* --------------------------------- done ---------------------------------- */

log('Sabeel \u00b7 Location errors')
if (failed) { console.log(`\n  ${failed} problem(s).`); process.exit(1) }
log('  every failure says which of the four things went wrong, and what to do about it.')
