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

if (failed) { console.log(`\n  ${failed} problem(s).`); process.exit(1) }
log('  Nothing on this screen can be tapped to no effect, and nothing is locked away.')
