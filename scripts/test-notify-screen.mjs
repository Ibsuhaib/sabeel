// The prayer notification screen must be usable before permission is granted,
// and its one button must never do nothing.
//
// Reported from a phone: "i clicked everything but nothing is happening and i
// cant go ahead to set the adhan and select the adhan which i want". Both halves
// were true and they were separate faults.
//
// The settings sat in the other arm of `perm !== 'granted' ? card : settings`,
// so until Android said yes there was no way even to look at the adhan choice —
// and if the permission request failed, no way ever. Choosing which adhan to
// hear does not depend on permission; only its firing does.
//
// And the button could fail invisibly three ways: priming the audio was awaited
// outside any catch and constructing an AudioContext throws on some WebViews;
// requestPermission can answer 'unsupported', which matched neither branch; and
// anything thrown took the handler down with it. Nothing happened, and there was
// nothing to report.
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, log } from './_util.mjs'

let failed = 0
const fail = m => { failed++; console.log(`  ✗ ${m}`) }

const src = fs.readFileSync(path.join(ROOT, 'src', 'pages', 'Notifications.jsx'), 'utf8')

log('Sabeel · The notification screen')

/* ------------------- the settings are not behind the gate ----------------- */

if (/perm !== 'granted' \?/.test(src)) {
  fail('the screen still hides its settings behind the permission, so the adhan cannot be chosen until Android says yes')
} else if (!/perm !== 'granted' && \(/.test(src)) {
  fail('the permission card is no longer shown when permission is missing')
} else {
  log('  the adhan and sound settings are reachable whether or not permission is granted')
}

// The adhan pickers must sit outside the permission branch. Checking by position:
// everything after the card's own closing must not be inside it.
const gate = src.indexOf("perm !== 'granted' &&")
const adhan = src.indexOf('Fajr adhan')
if (gate >= 0 && adhan >= 0 && adhan < gate) {
  fail('the Fajr adhan picker appears before the permission card — check the structure')
}

/* --------------------- the button always says something ------------------- */

const enable = src.slice(src.indexOf('async function enable'), src.indexOf('async function preview'))
if (!enable) { fail('enable() could not be found'); }

// Priming audio must not be able to stop the permission being asked for.
if (!/try \{ await prime\(\) \} catch/.test(enable)) {
  fail('prime() is awaited without a catch, so an AudioContext failure would stop the permission request')
}

// A throw from the request itself must be reported, not swallowed.
if (!/catch \(e\) \{[\s\S]{0,200}setMsg/.test(enable)) {
  fail('a failure to ask for permission is not reported to anyone')
}

// And the answer must be handled exhaustively — 'unsupported' matched no branch.
const branches = (enable.match(/setMsg\(/g) || []).length
if (branches < 3) {
  fail(`enable() has ${branches} outcome(s) that say something; it needs granted, denied, and everything else`)
}
if (!/result === 'granted'/.test(enable) || !/result === 'denied'/.test(enable)) {
  fail('enable() does not handle both granted and denied explicitly')
}
// The catch-all has to come after the two known answers rather than instead of them.
const lastGranted = enable.lastIndexOf("result === 'denied'")
const tail = enable.slice(lastGranted)
if (!/setMsg\(/.test(tail)) {
  fail('there is no message for an answer that is neither granted nor denied')
}
if (!failed) log('  every way the button can end says what happened, including the ones nobody expects')

/* --------------------------------- done ---------------------------------- */

/* ---------------- the reliability bridge matches the plugin --------------- */

// A method named on the JS side that the Java does not have fails at the bridge,
// is caught, and turns into `false` — so the button does nothing, which is the
// exact failure this screen exists to stop. The names are checked against each
// other rather than trusted.
const bridge = fs.readFileSync(path.join(ROOT, 'src', 'lib', 'reliability.js'), 'utf8')
const javaPath = path.join(ROOT, 'android/app/src/main/java/app/sabeel/quran/AlarmReliabilityPlugin.java')

if (fs.existsSync(javaPath)) {
  const java = fs.readFileSync(javaPath, 'utf8')
  const native = new Set([...java.matchAll(/public void (\w+)\(PluginCall/g)].map(m => m[1]))
  const called = new Set([...bridge.matchAll(/opener\('(\w+)'\)/g)].map(m => m[1]))
  called.add('status')

  for (const name of called) {
    if (!native.has(name)) fail(`reliability.js calls ${name}(), which AlarmReliabilityPlugin does not have`)
  }
  if (!failed) log(`  ${called.size} reliability methods, every one of them present in the plugin`)

  // And it must be registered, before super.onCreate, or none of them exist.
  // Comments stripped first. MainActivity explains *why* registration comes
  // before super.onCreate, and that sentence contains the words — so scanning
  // the raw text put the comment before the call and reported the opposite of
  // the truth. The third time this project has been caught reading prose as code.
  const main = fs.readFileSync(path.join(ROOT, 'android/app/src/main/java/app/sabeel/quran/MainActivity.java'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1')
  if (!main.includes('registerPlugin(AlarmReliabilityPlugin.class)')) {
    fail('AlarmReliabilityPlugin is never registered, so every one of its methods fails at the bridge')
  }
  const reg = main.indexOf('registerPlugin(AlarmReliabilityPlugin.class)')
  const sup = main.indexOf('super.onCreate')
  if (reg >= 0 && sup >= 0 && reg > sup) {
    fail('plugins are registered after super.onCreate, which is too late for the bridge to see them')
  }
}

if (failed) { console.log(`\n  ${failed} problem(s).`); process.exit(1) }
log('  Nothing on this screen can be tapped to no effect, and nothing is locked away.')
