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
if (!/Location tile/i.test(phone)) fail('the phone message does not say where to turn Location on')
if (/pick a city/i.test(phone)) fail('the phone message still tells people to give up and pick a city')
if (!failed) log(`  the phone is told exactly where to look: "${phone.slice(0, 58)}…"`)

/* --------------------------------- done ---------------------------------- */

log('Sabeel \u00b7 Location errors')
if (failed) { console.log(`\n  ${failed} problem(s).`); process.exit(1) }
log('  every failure says which of the four things went wrong, and what to do about it.')
